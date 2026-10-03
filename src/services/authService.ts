/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured, getSupabaseMissingVars } from '../lib/supabaseClient';
import { AuthSession, AuthUser, UserProfile, AuthProviderType, PendingOnboardingProfile } from '../types';
import { encryptUserData, decryptUserData } from './encryptionService';

const STORAGE_KEYS = {
  ONBOARDING_COMPLETED: 'ais_onboarding_completed_v1',
  PENDING_PROFILE_DRAFT: 'scanme_onboarding_pending_v1',
  LAST_AVATAR_PATH: 'ais_last_avatar_path_v1',
  SESSION_CACHE: 'ais_auth_session_cache_v1',
};

type AuthListener = (session: AuthSession | null) => void;
const authListeners = new Set<AuthListener>();

type RecoveryListener = (isRecovery: boolean) => void;
const recoveryListeners = new Set<RecoveryListener>();

type InitListener = (isReady: boolean) => void;
const initListeners = new Set<InitListener>();

export function subscribeAuth(listener: AuthListener): () => void {
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
}

export function subscribePasswordRecovery(listener: RecoveryListener): () => void {
  recoveryListeners.add(listener);
  return () => {
    recoveryListeners.delete(listener);
  };
}

export function subscribeAuthInit(listener: InitListener): () => void {
  initListeners.add(listener);
  return () => {
    initListeners.delete(listener);
  };
}

function notifyAuthListeners(session: AuthSession | null) {
  authListeners.forEach((cb) => {
    try {
      cb(session);
    } catch (e) {
      console.error('[authService] auth listener error:', e);
    }
  });
}

function notifyRecoveryListeners(isRecovery: boolean) {
  recoveryListeners.forEach((cb) => {
    try {
      cb(isRecovery);
    } catch (e) {
      console.error('[authService] recovery listener error:', e);
    }
  });
}

function notifyInitListeners(isReady: boolean) {
  initListeners.forEach((cb) => {
    try {
      cb(isReady);
    } catch (e) {
      console.error('[authService] init listener error:', e);
    }
  });
}

function base64ToBlob(base64: string, defaultMime = 'image/jpeg'): { blob: Blob; mime: string } {
  const parts = base64.split(';base64,');
  let mime = defaultMime;
  let rawData = base64;
  if (parts.length === 2) {
    mime = parts[0].replace('data:', '') || defaultMime;
    rawData = parts[1];
  }
  const byteString = atob(rawData);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return { blob: new Blob([ab], { type: mime }), mime };
}

export function formatUserFriendlyError(err: any, defaultMsg: string): string {
  if (!err) return defaultMsg;
  const msg: string = String(err.message || err.error_description || err || '').toLowerCase();

  if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
    return 'Please confirm your email address before signing in.';
  }
  if (msg.includes('invalid credentials') || msg.includes('invalid login credentials')) {
    return 'Invalid email or password.';
  }
  if (msg.includes('user already registered') || msg.includes('already exists') || msg.includes('already registered')) {
    return 'An account with this email already exists. Please sign in.';
  }
  if (msg.includes('token has expired or is invalid') || msg.includes('token is expired or invalid')) {
    return 'Invalid verification code. Please check your email and enter the latest 6-digit code.';
  }
  if (msg.includes('token has expired') || msg.includes('otp expired') || msg.includes('token expired')) {
    return 'Verification code has expired. Please request a new code.';
  }
  if (msg.includes('invalid otp') || msg.includes('token is invalid') || (msg.includes('token') && msg.includes('invalid'))) {
    return 'Invalid verification code. Please check your email and try again.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('security purposes') || msg.includes('over_email_send_rate_limit')) {
    return 'Too many OTP requests. For security purposes, please wait a few moments before trying again.';
  }
  if (msg.includes('smtp') || msg.includes('email provider is not enabled') || msg.includes('email rate limit exceeded')) {
    return 'Supabase email service is not configured or rate-limited. Please check Supabase Auth SMTP / Email settings.';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
    return 'Network connection error. Please check your internet connection and try again.';
  }
  if (msg.includes('row-level security') || msg.includes('rls') || msg.includes('policy')) {
    return 'Database permission error. Please verify account privileges.';
  }
  if (msg.includes('password should be at least 6')) {
    return 'Password must be at least 6 characters long.';
  }
  return err.message || defaultMsg;
}

export interface RegisterEmailParams {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface AuthOperationResult {
  success: boolean;
  session?: AuthSession;
  isNewUser?: boolean;
  isExistingUser?: boolean;
  emailConfirmationRequired?: boolean;
  message?: string;
  error?: string;
}

class AuthService {
  private activeSession: AuthSession | null = null;
  private isInitialized = false;
  private profilePromises = new Map<string, Promise<UserProfile | null>>();
  private isPasswordRecovery = false;
  private pendingProfile: PendingOnboardingProfile | null = null;

  constructor() {
    this.setupSupabaseAuthListener();
    this.setupLifecycleSessionRefresh();
    this.checkInitialUrlHash();
  }

  private clearLocalSessionState(): void {
    this.activeSession = null;
    this.isPasswordRecovery = false;
    this.clearPendingOnboardingProfile();
    notifyAuthListeners(null);
  }

  private getUnconfiguredError(): string {
    return `Supabase authentication is not configured. Missing environment variables: ${getSupabaseMissingVars().join(', ')}.`;
  }

  getCurrentUser(): AuthUser | null {
    return this.activeSession?.user || null;
  }

  getCurrentProfile(): UserProfile | null {
    return this.activeSession?.profile || null;
  }

  isAuthenticated(): boolean {
    return Boolean(this.activeSession?.user);
  }

  async setOnboardingCompleted(completed = true): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, completed ? 'true' : 'false');
      } catch {}
    }
    if (this.activeSession?.profile) {
      await this.saveProfile({ onboarding_completed: completed });
    }
  }

  async logout(): Promise<void> {
    return this.signOut();
  }

  async signOut(): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('[authService] Error signing out from Supabase:', e);
      }
    }
    this.clearLocalSessionState();
  }

  private setupLifecycleSessionRefresh(): void {
    if (typeof window === 'undefined' || !isSupabaseConfigured()) return;

    let refreshing = false;

    const refreshOnResume = async () => {
      if (refreshing || document.visibilityState === 'hidden') return;
      refreshing = true;

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('[authService] resume session check failed:', error.message);
          return;
        }

        if (data?.session?.user) {
          const expiresAtMs = (data.session.expires_at || 0) * 1000;
          const needsRefresh = !expiresAtMs || expiresAtMs - Date.now() < 60_000;

          if (needsRefresh) {
            const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              console.warn('[authService] resume token refresh failed:', refreshError.message);
              return;
            }
            if (refreshed?.session?.user) {
              await this.handleSupabaseSession(refreshed.session);
              return;
            }
          }

          await this.handleSupabaseSession(data.session);
        }
      } catch (err) {
        console.warn('[authService] resume session refresh error:', err);
      } finally {
        refreshing = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refreshOnResume();
    };
    const onPageShow = () => void refreshOnResume();
    const onOnline = () => void refreshOnResume();

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('online', onOnline);

    void refreshOnResume();
  }

  getSession(): AuthSession | null {
    return this.activeSession;
  }

  isAuthReady(): boolean {
    return this.isInitialized;
  }

  getPendingOnboardingProfile(): PendingOnboardingProfile | null {
    if (this.pendingProfile) return this.pendingProfile;
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEYS.PENDING_PROFILE_DRAFT);
        if (stored) {
          this.pendingProfile = JSON.parse(stored);
          return this.pendingProfile;
        }
      } catch (e) {
        console.warn('[authService] failed to parse pending profile draft:', e);
      }
    }
    return null;
  }

  setPendingOnboardingProfile(profile: PendingOnboardingProfile): void {
    this.pendingProfile = profile;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEYS.PENDING_PROFILE_DRAFT, JSON.stringify(profile));
      } catch (e) {
        console.warn('[authService] failed to save pending profile draft:', e);
      }
    }
  }

  clearPendingOnboardingProfile(): void {
    this.pendingProfile = null;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(STORAGE_KEYS.PENDING_PROFILE_DRAFT);
      } catch {}
    }
  }

  private checkInitialUrlHash() {
    if (typeof window !== 'undefined' && window.location.hash) {
      if (window.location.hash.includes('type=recovery')) {
        this.isPasswordRecovery = true;
        setTimeout(() => notifyRecoveryListeners(true), 300);
      }
    }
  }

  async initAuthSession(): Promise<AuthSession | null> {
    if (!isSupabaseConfigured()) {
      this.isInitialized = true;
      notifyInitListeners(true);
      return null;
    }

    try {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data?.session && data.session.user) {
        if (this.isPasswordRecovery) {
          this.activeSession = null;
          this.isInitialized = true;
          notifyInitListeners(true);
          return null;
        }

        const appSession = await this.handleSupabaseSession(data.session);
        this.isInitialized = true;
        notifyInitListeners(true);
        return appSession;
      } else {
        this.activeSession = null;
        this.isInitialized = true;
        notifyInitListeners(true);
        return null;
      }
    } catch (err) {
      console.warn('[authService] initAuthSession error:', err);
      this.isInitialized = true;
      notifyInitListeners(true);
      return null;
    }
  }

  private setupSupabaseAuthListener(): void {
    if (!isSupabaseConfigured()) {
      this.isInitialized = true;
      notifyInitListeners(true);
      return;
    }

    try {
      supabase.auth.onAuthStateChange(async (event, sbSession) => {
        if (event === 'PASSWORD_RECOVERY') {
          this.isPasswordRecovery = true;
          this.activeSession = null;
          notifyRecoveryListeners(true);
          return;
        }

        if (this.isPasswordRecovery) {
          if (event === 'SIGNED_OUT') {
            this.clearLocalSessionState();
          }
          return;
        }

        if (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED' ||
          event === 'INITIAL_SESSION'
        ) {
          if (sbSession && sbSession.user) {
            await this.handleSupabaseSession(sbSession);
          }
        } else if (event === 'SIGNED_OUT') {
          this.clearLocalSessionState();
        }
      });
    } catch (err) {
      console.warn('[authService] onAuthStateChange listener error:', err);
    }
  }

  private async handleSupabaseSession(sbSession: any): Promise<AuthSession | null> {
    try {
      const sbUser = sbSession.user;
      if (!sbUser) return null;

      const provider = (sbUser.app_metadata?.provider || 'email') as AuthProviderType;
      const authUser: AuthUser = {
        id: sbUser.id,
        auth_user_id: sbUser.id,
        email: sbUser.email,
        phone: sbUser.phone,
        provider,
        providerId: sbUser.id,
        displayName:
          sbUser.user_metadata?.full_name ||
          sbUser.user_metadata?.name ||
          sbUser.email?.split('@')[0] ||
          'Shopkeeper',
        photoURL: sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || '',
        createdAt: sbUser.created_at || new Date().toISOString(),
        lastLoginAt: sbUser.last_sign_in_at || new Date().toISOString(),
      };

      let profile = await this.fetchProfileFromDb(sbUser.id);

      const pending = this.getPendingOnboardingProfile();
      if (pending) {
        const saved = await this.saveProfileDirect(sbUser.id, {
          full_name: pending.fullName,
          business_name: pending.businessName,
          country: pending.country,
          address: pending.address,
          language: pending.language,
          currency: pending.currency,
          phone: pending.phone || sbUser.phone || '',
          email: sbUser.email || '',
          onboarding_completed: true,
        });
        if (saved) {
          profile = saved;
          this.clearPendingOnboardingProfile();
        }
      } else if (!profile) {
        profile = await this.createDefaultProfile(sbUser);
      }

      const session: AuthSession = {
        token: sbSession.access_token,
        user: authUser,
        profile,
        expiresAt: sbSession.expires_at ? sbSession.expires_at * 1000 : Date.now() + 3600 * 1000,
      };

      this.activeSession = session;
      notifyAuthListeners(session);
      return session;
    } catch (e) {
      console.error('[authService] Error handling Supabase session:', e);
      return null;
    }
  }

  async saveProfileDirect(authUserId: string, profileData: Partial<UserProfile>): Promise<UserProfile | null> {
    if (!isSupabaseConfigured()) return null;
    const now = new Date().toISOString();
    const cleanFullName = (profileData.full_name || '').trim();
    const cleanBusiness = (profileData.business_name || '').trim();
    const cleanUsername = (
      profileData.username ||
      cleanBusiness.toLowerCase().replace(/[^a-z0-9_]/g, '') ||
      `user_${authUserId.substring(0, 6)}`
    ).toLowerCase();

    const profilePayload = {
      full_name: cleanFullName,
      business_name: cleanBusiness,
      country: (profileData.country || 'Nepal').trim(),
      username: cleanUsername,
      email: (profileData.email || '').trim().toLowerCase(),
      phone: (profileData.phone || '').trim(),
      profile_image_url: profileData.profile_image_url || '',
      address: (profileData.address || '').trim(),
      language: profileData.language || 'English',
      currency: profileData.currency || 'NPR',
      onboarding_completed: true,
    };

    try {
      const encrypted_payload = await encryptUserData(authUserId, profilePayload);
      const row = {
        auth_user_id: authUserId,
        encrypted_payload,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert(row, { onConflict: 'auth_user_id' })
        .select('id, auth_user_id, encrypted_payload, created_at, updated_at')
        .maybeSingle();

      if (error) {
        console.error('[authService] saveProfileDirect error:', error);
        return null;
      }
      if (!data) return null;

      const decrypted = await decryptUserData<Record<string, any>>(authUserId, data.encrypted_payload);
      const profile: UserProfile = {
        id: data.id,
        auth_user_id: data.auth_user_id,
        full_name: decrypted.full_name || '',
        business_name: decrypted.business_name || '',
        country: decrypted.country || 'Nepal',
        username: decrypted.username || '',
        email: decrypted.email || '',
        phone: decrypted.phone || '',
        profile_image_url: decrypted.profile_image_url || '',
        address: decrypted.address || '',
        language: decrypted.language || 'English',
        currency: decrypted.currency || 'NPR',
        onboarding_completed: Boolean(decrypted.onboarding_completed),
        created_at: data.created_at || now,
        updated_at: data.updated_at || now,
        is_profile_complete: Boolean(decrypted.full_name && (decrypted.business_name || decrypted.username)),
      };

      if (this.activeSession && this.activeSession.user.id === authUserId) {
        this.activeSession.profile = profile;
        notifyAuthListeners(this.activeSession);
      }

      return profile;
    } catch (e) {
      console.error('[authService] saveProfileDirect exception:', e);
      return null;
    }
  }

  private async fetchProfileFromDb(authUserId: string, bypassCache = false): Promise<UserProfile | null> {
    if (!isSupabaseConfigured()) return null;
    if (!bypassCache && this.activeSession?.profile?.auth_user_id === authUserId) {
      return this.activeSession.profile;
    }
    if (this.profilePromises.has(authUserId)) {
      return this.profilePromises.get(authUserId)!;
    }

    const promise = (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, auth_user_id, encrypted_payload, created_at, updated_at')
          .eq('auth_user_id', authUserId)
          .maybeSingle();

        if (error || !data) return null;

        if (!data.encrypted_payload) {
          console.warn('[authService] Profile exists without encrypted_payload; refusing to read plaintext profile columns.');
          return null;
        }

        const decrypted = await decryptUserData<Record<string, any>>(authUserId, data.encrypted_payload);
        return {
          id: data.id,
          auth_user_id: data.auth_user_id,
          full_name: decrypted.full_name || '',
          business_name: decrypted.business_name || '',
          country: decrypted.country || 'Nepal',
          username: decrypted.username || '',
          email: decrypted.email || '',
          phone: decrypted.phone || '',
          profile_image_url: decrypted.profile_image_url || '',
          address: decrypted.address || '',
          language: decrypted.language || 'English',
          currency: decrypted.currency || 'NPR',
          onboarding_completed: Boolean(decrypted.onboarding_completed),
          created_at: data.created_at,
          updated_at: data.updated_at,
          is_profile_complete: Boolean(decrypted.full_name && (decrypted.business_name || decrypted.username)),
        };
      } catch (e) {
        console.error('[authService] fetchProfileFromDb decryption error:', e);
        return null;
      } finally {
        this.profilePromises.delete(authUserId);
      }
    })();

    this.profilePromises.set(authUserId, promise);
    return promise;
  }

  private async createDefaultProfile(sbUser: any): Promise<UserProfile | null> {
    if (!isSupabaseConfigured()) return null;

    const meta = sbUser.user_metadata || {};
    const defaultName = (meta.full_name || meta.name || '').trim();
    const defaultBusiness = (meta.business_name || meta.shop_name || '').trim();
    const defaultCountry = (meta.country || 'Nepal').trim();
    const defaultUsername = (
      meta.username ||
      defaultBusiness.toLowerCase().replace(/[^a-z0-9_]/g, '') ||
      sbUser.email?.split('@')[0] ||
      `user_${sbUser.id.substring(0, 6)}`
    ).toLowerCase().replace(/[^a-zA-Z0-9_]/g, '');

    const encryptedProfile = await this.saveProfileDirect(sbUser.id, {
      full_name: defaultName || 'Shopkeeper',
      business_name: defaultBusiness || 'My Store',
      country: defaultCountry || 'Nepal',
      username: defaultUsername || `user_${sbUser.id.substring(0, 6)}`,
      email: sbUser.email || '',
      phone: sbUser.phone || meta.phone || '',
      profile_image_url: meta.avatar_url || meta.picture || '',
      address: '',
      language: 'English',
      currency: 'NPR',
    });

    if (encryptedProfile) return encryptedProfile;

    return {
      id: `profile_${sbUser.id.substring(0, 8)}`,
      auth_user_id: sbUser.id,
      full_name: defaultName || 'Shopkeeper',
      business_name: defaultBusiness || 'My Store',
      country: defaultCountry || 'Nepal',
      username: defaultUsername || `user_${sbUser.id.substring(0, 6)}`,
      email: sbUser.email || '',
      phone: sbUser.phone || meta.phone || '',
      profile_image_url: meta.avatar_url || meta.picture || '',
      address: '',
      language: 'English',
      currency: 'NPR',
      onboarding_completed: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_profile_complete: true,
    };
  }

  async loginWithEmailPassword(
    email: string,
    password: string
  ): Promise<AuthOperationResult> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: this.getUnconfiguredError(),
      };
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return {
        success: false,
        error: 'Please enter both email address and password.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return {
          success: false,
          error: formatUserFriendlyError(error, 'Failed to sign in. Please check your email and password.'),
        };
      }

      if (data.session) {
        const appSession = await this.handleSupabaseSession(data.session);
        return {
          success: true,
          session: appSession || undefined,
        };
      }

      return {
        success: false,
        error: 'Login succeeded but session could not be established.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: formatUserFriendlyError(err, 'An error occurred during sign in.'),
      };
    }
  }

  async registerWithEmail(params: RegisterEmailParams): Promise<AuthOperationResult> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: this.getUnconfiguredError(),
      };
    }

    const cleanEmail = params.email.trim().toLowerCase();
    const cleanName = params.fullName.trim();

    if (!cleanEmail || !params.password || !cleanName) {
      return {
        success: false,
        error: 'Full name, email address, and password are required.',
      };
    }

    this.setPendingOnboardingProfile({
      fullName: cleanName,
      businessName: '',
      country: 'Nepal',
      address: '',
      language: 'English',
      currency: 'NPR',
      phone: params.phone || '',
    });

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: params.password,
        options: {
          data: {
            full_name: cleanName,
            phone: params.phone || '',
          },
        },
      });

      if (error) {
        const userMsg = formatUserFriendlyError(error, 'Registration failed.');
        const isExisting =
          error.message?.toLowerCase().includes('already registered') ||
          error.message?.toLowerCase().includes('already exists');
        return {
          success: false,
          error: userMsg,
          isExistingUser: isExisting,
        };
      }

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        return {
          success: false,
          error: 'An account with this email already exists. Please sign in.',
          isExistingUser: true,
        };
      }

      if (data.user && !data.session) {
        return {
          success: true,
          emailConfirmationRequired: true,
          message: `Account created. Please enter the verification code sent to ${cleanEmail}.`,
        };
      }

      if (data.session) {
        const appSession = await this.handleSupabaseSession(data.session);
        return {
          success: true,
          session: appSession || undefined,
          isNewUser: true,
        };
      }

      return {
        success: true,
        emailConfirmationRequired: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error: formatUserFriendlyError(err, 'An error occurred during registration.'),
      };
    }
  }

  async resetPasswordForEmail(
    email: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: this.getUnconfiguredError(),
      };
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return {
        success: false,
        error: 'Please enter a valid email address.',
      };
    }

    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        return {
          success: false,
          message: formatUserFriendlyError(error, 'Failed to send password reset email.'),
          error: error.message,
        };
      }

      return {
        success: true,
        message: `Password reset link sent to ${cleanEmail}. Please check your inbox.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: formatUserFriendlyError(err, 'Failed to request password reset.'),
        error: err.message,
      };
    }
  }

  async updateUserPassword(
    newPassword: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: this.getUnconfiguredError(),
      };
    }

    if (!newPassword || newPassword.length < 6) {
      return {
        success: false,
        error: 'Password must be at least 6 characters long.',
      };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return {
          success: false,
          message: formatUserFriendlyError(error, 'Failed to update password.'),
          error: error.message,
        };
      }

      this.isPasswordRecovery = false;
      return {
        success: true,
        message: 'Password updated successfully.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: formatUserFriendlyError(err, 'Failed to update password.'),
        error: err.message,
      };
    }
  }

  async loginWithOAuth(
    provider: 'google' | 'facebook'
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: this.getUnconfiguredError(),
      };
    }

    try {
      const redirectUrl = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        return {
          success: false,
          error: formatUserFriendlyError(error, `Failed to authenticate with ${provider}.`),
        };
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: formatUserFriendlyError(err, `${provider} authentication was interrupted.`),
      };
    }
  }

  async sendEmailOtp(
    email: string
  ): Promise<{ success: boolean; message: string; error?: string }> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        message: this.getUnconfiguredError(),
        error: 'SUPABASE_UNCONFIGURED',
      };
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return {
        success: false,
        message: 'Please enter a valid email address.',
        error: 'INVALID_EMAIL',
      };
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
      });

      if (error) {
        return {
          success: false,
          message: formatUserFriendlyError(error, 'Failed to send verification code to your email.'),
          error: error.message,
        };
      }

      return {
        success: true,
        message: `We sent a 6-digit verification code to ${cleanEmail}.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: formatUserFriendlyError(err, 'Failed to send OTP code to email.'),
        error: err.message,
      };
    }
  }

  async resendSignupConfirmationOtp(
    email: string
  ): Promise<{ success: boolean; message: string; error?: string }> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        message: this.getUnconfiguredError(),
        error: 'SUPABASE_UNCONFIGURED',
      };
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return {
        success: false,
        message: 'Please enter a valid email address.',
        error: 'INVALID_EMAIL',
      };
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
      });

      if (error) {
        return {
          success: false,
          message: formatUserFriendlyError(error, 'Failed to resend the confirmation code.'),
          error: error.message,
        };
      }

      return {
        success: true,
        message: `A new 6-digit confirmation code was sent to ${cleanEmail}.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: formatUserFriendlyError(err, 'Failed to resend the confirmation code.'),
        error: err.message,
      };
    }
  }

  async verifyEmailOtp(
    email: string,
    otp: string,
    verificationType: 'email' | 'signup' = 'email'
  ): Promise<AuthOperationResult> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: this.getUnconfiguredError(),
      };
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return {
        success: false,
        error: 'Please enter a valid email address.',
      };
    }

    const cleanToken = otp.replace(/\D/g, '').slice(0, 6);
    if (cleanToken.length !== 6) {
      return {
        success: false,
        error: 'Please enter the complete 6-digit verification code.',
      };
    }

    try {
      let { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: verificationType,
      });

      if (error && (verificationType === 'signup' || verificationType === 'email')) {
        const altType = verificationType === 'signup' ? 'email' : 'signup';
        const altResult = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: altType,
        });
        if (!altResult.error && altResult.data) {
          data = altResult.data;
          error = null;
        }
      }

      if (error) {
        return {
          success: false,
          error: formatUserFriendlyError(error, 'Invalid or expired verification code. Please check your email and try again.'),
        };
      }

      if (data.session) {
        const appSession = await this.handleSupabaseSession(data.session);
        return {
          success: true,
          session: appSession || undefined,
          isNewUser: !appSession?.profile?.is_profile_complete,
        };
      }

      return {
        success: false,
        error: 'Verification succeeded but session could not be established.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: formatUserFriendlyError(err, 'Failed to verify OTP code.'),
      };
    }
  }

  async checkWhatsAppStatus(): Promise<{ success: boolean; message: string; error?: string }> {
    return {
      success: false,
      message: 'WhatsApp Business API is not configured on this project. Please sign in with Email, Google, Facebook, or Email OTP.',
      error: 'WHATSAPP_UNAVAILABLE',
    };
  }

  async uploadAvatar(
    fileOrBase64: string | File | Blob,
    mimeType = 'image/jpeg'
  ): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: this.getUnconfiguredError(),
      };
    }

    const session = this.getSession();
    const userId = session?.user?.id || session?.user?.auth_user_id;

    if (!userId) {
      return { success: false, error: 'User must be authenticated to upload profile photo.' };
    }

    let uploadBlob: Blob;
    let finalMime = mimeType;

    if (typeof fileOrBase64 === 'string') {
      const converted = base64ToBlob(fileOrBase64, mimeType);
      uploadBlob = converted.blob;
      finalMime = converted.mime;
    } else {
      uploadBlob = fileOrBase64;
      finalMime = fileOrBase64.type || mimeType;
    }

    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validMimes.includes(finalMime.toLowerCase())) {
      return {
        success: false,
        error: 'Unsupported image format. Please upload JPG, PNG, or WebP.',
      };
    }

    if (uploadBlob.size > 5 * 1024 * 1024) {
      return {
        success: false,
        error: 'Image is too large. Maximum size is 5MB.',
      };
    }

    try {
      const fileExt = finalMime.includes('png') ? 'png' : finalMime.includes('webp') ? 'webp' : 'jpg';
      const fileName = `profile_${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, uploadBlob, {
          contentType: finalMime,
          upsert: true,
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('[authService] Supabase storage upload error:', uploadError);
        return {
          success: false,
          error: formatUserFriendlyError(uploadError, 'Failed to upload photo to storage.'),
        };
      }

      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      const previousPath = localStorage.getItem(STORAGE_KEYS.LAST_AVATAR_PATH);
      if (previousPath && previousPath !== filePath) {
        try {
          await supabase.storage.from('profile-images').remove([previousPath]);
        } catch (delErr) {
          console.warn('[authService] Could not remove old avatar:', delErr);
        }
      }
      localStorage.setItem(STORAGE_KEYS.LAST_AVATAR_PATH, filePath);

      await this.saveProfile({ profile_image_url: publicUrl });

      return {
        success: true,
        avatarUrl: publicUrl,
      };
    } catch (err: any) {
      console.error('[authService] uploadAvatar error:', err);
      return {
        success: false,
        error: formatUserFriendlyError(err, 'Failed to process and store profile photo.'),
      };
    }
  }

  async saveProfile(
    profileData: Partial<UserProfile>
  ): Promise<{ success: boolean; profile?: UserProfile; error?: string }> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: this.getUnconfiguredError(),
      };
    }

    const session = this.getSession();
    if (!session || !session.user) {
      return { success: false, error: 'User is not authenticated.' };
    }

    const authUserId = session.user.id || session.user.auth_user_id;
    const now = new Date().toISOString();

    const cleanBusiness = (profileData.business_name ?? session.profile?.business_name ?? '').trim();
    const cleanCountry = (profileData.country ?? session.profile?.country ?? 'Nepal').trim();
    const cleanUsername = (
      profileData.username ??
      session.profile?.username ??
      (cleanBusiness.toLowerCase().replace(/[^a-z0-9_]/g, '') || `user_${authUserId.substring(0, 6)}`)
    ).trim().toLowerCase();

    const updatedProfile: UserProfile = {
      id: session.profile?.id || '',
      auth_user_id: authUserId,
      full_name: (profileData.full_name ?? session.profile?.full_name ?? '').trim(),
      business_name: cleanBusiness,
      country: cleanCountry,
      username: cleanUsername,
      email: (profileData.email ?? session.profile?.email ?? session.user.email ?? '').trim().toLowerCase(),
      phone: (profileData.phone ?? session.profile?.phone ?? session.user.phone ?? '').trim(),
      profile_image_url: profileData.profile_image_url ?? session.profile?.profile_image_url ?? '',
      address: (profileData.address ?? session.profile?.address ?? '').trim(),
      language: profileData.language ?? session.profile?.language ?? 'English',
      currency: profileData.currency ?? session.profile?.currency ?? 'NPR',
      onboarding_completed: true,
      created_at: session.profile?.created_at || now,
      updated_at: now,
      is_profile_complete: true,
    };

    try {
      const encrypted_payload = await encryptUserData(authUserId, {
        full_name: updatedProfile.full_name,
        business_name: updatedProfile.business_name,
        country: updatedProfile.country,
        username: updatedProfile.username,
        email: updatedProfile.email,
        phone: updatedProfile.phone,
        profile_image_url: updatedProfile.profile_image_url,
        address: updatedProfile.address,
        language: updatedProfile.language,
        currency: updatedProfile.currency,
        onboarding_completed: true,
      });

      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          {
            auth_user_id: authUserId,
            encrypted_payload,
            updated_at: now,
          },
          { onConflict: 'auth_user_id' }
        )
        .select('id, auth_user_id, encrypted_payload, created_at, updated_at')
        .single();

      if (error) {
        console.error('[authService] saveProfile Supabase error:', error);
        return {
          success: false,
          error: formatUserFriendlyError(error, 'Failed to save encrypted profile in database.'),
        };
      }

      if (data?.encrypted_payload) {
        const decrypted = await decryptUserData<Record<string, any>>(authUserId, data.encrypted_payload);
        updatedProfile.id = data.id;
        updatedProfile.created_at = data.created_at || now;
        updatedProfile.updated_at = data.updated_at || now;
        updatedProfile.full_name = decrypted.full_name || '';
        updatedProfile.business_name = decrypted.business_name || '';
        updatedProfile.country = decrypted.country || 'Nepal';
        updatedProfile.username = decrypted.username || '';
        updatedProfile.email = decrypted.email || '';
        updatedProfile.phone = decrypted.phone || '';
        updatedProfile.profile_image_url = decrypted.profile_image_url || '';
        updatedProfile.address = decrypted.address || '';
        updatedProfile.language = decrypted.language || 'English';
        updatedProfile.currency = decrypted.currency || 'NPR';
      }
    } catch (err: any) {
      console.error('[authService] saveProfile encryption/network error:', err);
      return {
        success: false,
        error: formatUserFriendlyError(err, 'Failed to securely save profile.'),
      };
    }

    const newSession: AuthSession = {
      ...session,
      profile: updatedProfile,
    };
    this.activeSession = newSession;
    notifyAuthListeners(newSession);

    return {
      success: true,
      profile: updatedProfile,
    };
  }
}

export const authService = new AuthService();
