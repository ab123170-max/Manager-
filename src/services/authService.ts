/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { AuthSession, AuthUser, UserProfile, AuthProviderType } from '../types';

const STORAGE_KEYS = {
  SESSION_CACHE: 'ais_auth_session_cache_v1',
  ONBOARDING_COMPLETED: 'ais_onboarding_completed_v1',
  LAST_AVATAR_PATH: 'ais_last_avatar_path_v1',
};

type AuthListener = (session: AuthSession | null) => void;
const listeners = new Set<AuthListener>();

export function subscribeAuth(listener: AuthListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(session: AuthSession | null) {
  listeners.forEach((cb) => {
    try {
      cb(session);
    } catch (e) {
      console.error('[authService] listener error:', e);
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

function formatUserFriendlyError(err: any, defaultMsg: string): string {
  if (!err) return defaultMsg;
  const msg: string = String(err.message || err.error_description || err || '').toLowerCase();

  if (msg.includes('invalid credentials') || msg.includes('invalid login credentials')) {
    return 'Invalid email or password. Please verify and try again.';
  }
  if (msg.includes('user already registered') || msg.includes('already exists')) {
    return 'An account with this email already exists. Please log in instead.';
  }
  if (msg.includes('token has expired') || msg.includes('otp expired') || msg.includes('invalid otp')) {
    return 'Verification code has expired or is invalid. Please request a new code.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Too many attempts. Please wait a few moments before trying again.';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
    return 'Network connection error. Please check your internet connection and try again.';
  }
  if (msg.includes('row-level security') || msg.includes('rls') || msg.includes('policy')) {
    return 'Storage or database permission denied. Please verify your account credentials.';
  }
  return err.message || defaultMsg;
}

class AuthService {
  private activeSession: AuthSession | null = null;
  private isInitialized = false;

  constructor() {
    this.initSessionFromCache();
    this.setupSupabaseAuthListener();
  }

  private initSessionFromCache(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSION_CACHE);
      if (raw) {
        this.activeSession = JSON.parse(raw);
      }
    } catch {
      this.activeSession = null;
    }
  }

  /**
   * Initializes and listens for Supabase Auth state changes:
   * SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED.
   */
  private async setupSupabaseAuthListener(): Promise<void> {
    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      // 1. Check existing session on startup
      const { data: initialData, error: sessionErr } = await supabase.auth.getSession();
      if (!sessionErr && initialData?.session) {
        await this.handleSupabaseSession(initialData.session);
      } else if (!initialData?.session && this.activeSession?.token.startsWith('sb_')) {
        this.clearSession();
      }

      // 2. Listen to real-time auth changes
      supabase.auth.onAuthStateChange(async (event, sbSession) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (sbSession) {
            await this.handleSupabaseSession(sbSession);
          }
        } else if (event === 'SIGNED_OUT') {
          this.clearSession();
        }
      });

      this.isInitialized = true;
    } catch (err) {
      console.warn('[authService] Supabase Auth initialization:', err);
    }
  }

  /**
   * Transforms a Supabase session into an application AuthSession and ensures a profile exists.
   */
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
        displayName: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || sbUser.email?.split('@')[0],
        photoURL: sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || '',
        createdAt: sbUser.created_at || new Date().toISOString(),
        lastLoginAt: sbUser.last_sign_in_at || new Date().toISOString(),
      };

      // Fetch profile from public.profiles table
      let profile = await this.fetchProfileFromDb(sbUser.id);

      // If profile does not exist, automatically create one in public.profiles table
      if (!profile) {
        profile = await this.createDefaultProfile(sbUser);
      }

      const session: AuthSession = {
        token: `sb_${sbSession.access_token}`,
        user: authUser,
        profile,
        expiresAt: sbSession.expires_at ? sbSession.expires_at * 1000 : Date.now() + 3600 * 1000,
      };

      this.setSession(session);
      return session;
    } catch (e) {
      console.error('[authService] Error handling Supabase session:', e);
      return null;
    }
  }

  /**
   * Fetches user profile from Supabase profiles table.
   */
  private async fetchProfileFromDb(authUserId: string): Promise<UserProfile | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (error) {
        console.warn('[authService] fetchProfileFromDb error:', error.message);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        auth_user_id: data.auth_user_id,
        full_name: data.full_name || '',
        username: data.username || '',
        email: data.email || '',
        phone: data.phone || '',
        profile_image_url: data.profile_image_url || '',
        address: data.address || '',
        language: data.language || 'English',
        currency: data.currency || 'NPR',
        created_at: data.created_at,
        updated_at: data.updated_at,
        is_profile_complete: Boolean(data.full_name && data.username),
      };
    } catch (e) {
      console.error('[authService] fetchProfileFromDb exception:', e);
      return null;
    }
  }

  /**
   * Creates an initial profile record in Supabase profiles table.
   */
  private async createDefaultProfile(sbUser: any): Promise<UserProfile | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const now = new Date().toISOString();
      const meta = sbUser.user_metadata || {};
      const defaultName = meta.full_name || meta.name || '';
      const defaultUsername = (
        meta.username ||
        sbUser.email?.split('@')[0] ||
        `user_${sbUser.id.substring(0, 6)}`
      ).toLowerCase().replace(/[^a-zA-Z0-9_]/g, '');

      const initialData = {
        auth_user_id: sbUser.id,
        full_name: defaultName,
        username: defaultUsername,
        email: sbUser.email || '',
        phone: sbUser.phone || '',
        profile_image_url: meta.avatar_url || meta.picture || '',
        address: '',
        language: 'English',
        currency: 'NPR',
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert(initialData)
        .select()
        .single();

      if (error) {
        console.warn('[authService] createDefaultProfile insert failed:', error.message);
        return null;
      }

      return {
        id: data.id,
        auth_user_id: data.auth_user_id,
        full_name: data.full_name || '',
        username: data.username || '',
        email: data.email || '',
        phone: data.phone || '',
        profile_image_url: data.profile_image_url || '',
        address: data.address || '',
        language: data.language || 'English',
        currency: data.currency || 'NPR',
        created_at: data.created_at,
        updated_at: data.updated_at,
        is_profile_complete: Boolean(data.full_name && data.username),
      };
    } catch (e) {
      console.error('[authService] createDefaultProfile exception:', e);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Session Getters & Setters
  // ---------------------------------------------------------------------------
  getSession(): AuthSession | null {
    if (this.activeSession) {
      if (this.activeSession.expiresAt && Date.now() > this.activeSession.expiresAt) {
        this.clearSession();
        return null;
      }
      return this.activeSession;
    }
    return null;
  }

  setSession(session: AuthSession): void {
    this.activeSession = session;
    try {
      localStorage.setItem(STORAGE_KEYS.SESSION_CACHE, JSON.stringify(session));
    } catch (e) {
      console.error('[authService] setSession localStorage error:', e);
    }
    notifyListeners(session);
  }

  async clearSession(): Promise<void> {
    this.activeSession = null;
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSION_CACHE);
    } catch {}

    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('[authService] Supabase signOut error:', e);
      }
    }
    notifyListeners(null);
  }

  isAuthenticated(): boolean {
    const session = this.getSession();
    return Boolean(session && session.user && session.token);
  }

  getCurrentUser(): AuthUser | null {
    return this.getSession()?.user || null;
  }

  getCurrentProfile(): UserProfile | null {
    return this.getSession()?.profile || null;
  }

  isOnboardingCompleted(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED) === 'true';
    } catch {
      return false;
    }
  }

  setOnboardingCompleted(completed: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, completed ? 'true' : 'false');
    } catch (e) {
      console.error('[authService] Failed to set onboarding state:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Google & Facebook OAuth Authentication
  // ---------------------------------------------------------------------------
  async loginWithOAuth(
    provider: 'google' | 'facebook',
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; session?: AuthSession; isNewUser?: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      // Local development fallback
      const authUserId = `usr_${provider}_${Math.random().toString(36).substring(2, 9)}`;
      const now = new Date().toISOString();
      const fallbackUser: AuthUser = {
        id: authUserId,
        auth_user_id: authUserId,
        provider,
        displayName: metadata?.name || (provider === 'google' ? 'Google User' : 'Facebook User'),
        email: metadata?.email || `${provider}_user@example.com`,
        createdAt: now,
        lastLoginAt: now,
      };
      const fallbackProfile: UserProfile = {
        id: `prf_${Date.now()}`,
        auth_user_id: authUserId,
        full_name: fallbackUser.displayName || '',
        username: `${provider}_user`,
        email: fallbackUser.email || '',
        phone: '',
        profile_image_url: '',
        address: '',
        language: 'English',
        currency: 'NPR',
        created_at: now,
        updated_at: now,
        is_profile_complete: false,
      };
      const fallbackSession: AuthSession = {
        token: `mock_${provider}_${Date.now()}`,
        user: fallbackUser,
        profile: fallbackProfile,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };
      this.setSession(fallbackSession);
      return { success: true, session: fallbackSession, isNewUser: true };
    }

    try {
      const redirectUrl = window.location.origin;
      const { data, error } = await supabase.auth.signInWithOAuth({
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

  // ---------------------------------------------------------------------------
  // 2. Mobile Phone + OTP Authentication
  // ---------------------------------------------------------------------------
  async sendPhoneOtp(
    countryCode: string,
    phone: string
  ): Promise<{ success: boolean; message: string; previewCode?: string; error?: string }> {
    const cleanNum = phone.replace(/[^0-9]/g, '');
    const cleanCode = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
    const fullPhone = `${cleanCode}${cleanNum}`;

    if (!isSupabaseConfigured()) {
      return {
        success: true,
        message: `Verification code sent to ${fullPhone}. (Dev fallback: 123456)`,
        previewCode: '123456',
      };
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });

      if (error) {
        return {
          success: false,
          message: formatUserFriendlyError(error, 'Failed to send SMS code. Please try again.'),
          error: error.message,
        };
      }

      return {
        success: true,
        message: `Verification code successfully sent via SMS to ${fullPhone}.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: formatUserFriendlyError(err, 'Failed to send SMS code.'),
        error: err.message,
      };
    }
  }

  async verifyPhoneOtp(
    countryCode: string,
    phone: string,
    otp: string
  ): Promise<{ success: boolean; session?: AuthSession; isNewUser?: boolean; error?: string }> {
    const cleanNum = phone.replace(/[^0-9]/g, '');
    const cleanCode = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
    const fullPhone = `${cleanCode}${cleanNum}`;

    if (!isSupabaseConfigured()) {
      const authUserId = `usr_ph_${cleanNum.substring(cleanNum.length - 6)}`;
      const now = new Date().toISOString();
      const fallbackUser: AuthUser = {
        id: authUserId,
        auth_user_id: authUserId,
        provider: 'phone',
        phone: fullPhone,
        createdAt: now,
        lastLoginAt: now,
      };
      const fallbackProfile: UserProfile = {
        id: `prf_${Date.now()}`,
        auth_user_id: authUserId,
        full_name: '',
        username: `user_${cleanNum.slice(-4)}`,
        email: '',
        phone: fullPhone,
        profile_image_url: '',
        address: '',
        language: 'English',
        currency: 'NPR',
        created_at: now,
        updated_at: now,
        is_profile_complete: false,
      };
      const fallbackSession: AuthSession = {
        token: `mock_phone_${Date.now()}`,
        user: fallbackUser,
        profile: fallbackProfile,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };
      this.setSession(fallbackSession);
      return { success: true, session: fallbackSession, isNewUser: true };
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otp.trim(),
        type: 'sms',
      });

      if (error) {
        return {
          success: false,
          error: formatUserFriendlyError(error, 'Invalid or expired verification code.'),
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

  // ---------------------------------------------------------------------------
  // 3. Email Authentication
  // ---------------------------------------------------------------------------
  async loginWithEmail(
    email: string,
    mode: 'login' | 'signup' = 'login',
    password?: string
  ): Promise<{ success: boolean; session?: AuthSession; isNewUser?: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();

    if (!isSupabaseConfigured()) {
      const authUserId = `usr_em_${cleanEmail.split('@')[0]}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const fallbackUser: AuthUser = {
        id: authUserId,
        auth_user_id: authUserId,
        provider: 'email',
        email: cleanEmail,
        createdAt: now,
        lastLoginAt: now,
      };
      const fallbackProfile: UserProfile = {
        id: `prf_${Date.now()}`,
        auth_user_id: authUserId,
        full_name: '',
        username: cleanEmail.split('@')[0],
        email: cleanEmail,
        phone: '',
        profile_image_url: '',
        address: '',
        language: 'English',
        currency: 'NPR',
        created_at: now,
        updated_at: now,
        is_profile_complete: false,
      };
      const fallbackSession: AuthSession = {
        token: `mock_email_${Date.now()}`,
        user: fallbackUser,
        profile: fallbackProfile,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };
      this.setSession(fallbackSession);
      return { success: true, session: fallbackSession, isNewUser: mode === 'signup' };
    }

    try {
      if (mode === 'signup') {
        // If password not provided, use Magic Link OTP
        if (!password) {
          const { error } = await supabase.auth.signInWithOtp({
            email: cleanEmail,
            options: {
              emailRedirectTo: window.location.origin,
            },
          });
          if (error) {
            return { success: false, error: formatUserFriendlyError(error, 'Sign up failed.') };
          }
          return {
            success: true,
            error: 'Check your email for the confirmation link to sign in.',
          };
        }

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) {
          return { success: false, error: formatUserFriendlyError(error, 'Registration failed.') };
        }

        if (data.session) {
          const appSession = await this.handleSupabaseSession(data.session);
          return { success: true, session: appSession || undefined, isNewUser: true };
        }

        return {
          success: true,
          error: 'Please check your email to confirm your account before logging in.',
        };
      } else {
        // Login mode
        if (password) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (error) {
            return { success: false, error: formatUserFriendlyError(error, 'Invalid email or password.') };
          }

          if (data.session) {
            const appSession = await this.handleSupabaseSession(data.session);
            return { success: true, session: appSession || undefined, isNewUser: false };
          }
        } else {
          // Magic link fallback
          const { error } = await supabase.auth.signInWithOtp({
            email: cleanEmail,
            options: {
              emailRedirectTo: window.location.origin,
            },
          });
          if (error) {
            return { success: false, error: formatUserFriendlyError(error, 'Login request failed.') };
          }
          return {
            success: true,
            error: 'Check your email for the magic sign-in link.',
          };
        }
      }

      return { success: false, error: 'Authentication could not complete.' };
    } catch (err: any) {
      return {
        success: false,
        error: formatUserFriendlyError(err, 'Email authentication error.'),
      };
    }
  }

  // ---------------------------------------------------------------------------
  // 4. WhatsApp Status Check
  // ---------------------------------------------------------------------------
  async checkWhatsAppStatus(): Promise<{ success: boolean; message: string; error?: string }> {
    return {
      success: false,
      message: 'WhatsApp Business API is not configured on this project. Please sign in via Mobile SMS OTP, Google, or Email.',
      error: 'WHATSAPP_UNAVAILABLE',
    };
  }

  // ---------------------------------------------------------------------------
  // 5. Supabase Storage Profile Photo Upload & Replacement
  // ---------------------------------------------------------------------------
  async uploadAvatar(
    fileOrBase64: string | File | Blob,
    mimeType = 'image/jpeg'
  ): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
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

    // Validate mime type
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validMimes.includes(finalMime.toLowerCase())) {
      return {
        success: false,
        error: 'Unsupported image format. Please upload JPG, PNG, or WebP.',
      };
    }

    // Validate size (maximum 5MB)
    if (uploadBlob.size > 5 * 1024 * 1024) {
      return {
        success: false,
        error: 'Image is too large. Maximum size is 5MB.',
      };
    }

    // If Supabase is unconfigured, return data URL fallback for seamless demo
    if (!isSupabaseConfigured()) {
      if (typeof fileOrBase64 === 'string') {
        return { success: true, avatarUrl: fileOrBase64 };
      }
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ success: true, avatarUrl: reader.result as string });
        reader.readAsDataURL(uploadBlob);
      });
    }

    try {
      const fileExt = finalMime.includes('png') ? 'png' : finalMime.includes('webp') ? 'webp' : 'jpg';
      const fileName = `profile_${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // 1. Upload new image to Supabase Storage: profile-images/{userId}/{fileName}
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

      // 2. Retrieve public URL
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // 3. Delete previous photo from storage only after new upload succeeds
      const previousPath = localStorage.getItem(STORAGE_KEYS.LAST_AVATAR_PATH);
      if (previousPath && previousPath !== filePath) {
        try {
          await supabase.storage.from('profile-images').remove([previousPath]);
        } catch (delErr) {
          console.warn('[authService] Could not remove old avatar:', delErr);
        }
      }
      localStorage.setItem(STORAGE_KEYS.LAST_AVATAR_PATH, filePath);

      // 4. Update profile in database immediately
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

  // ---------------------------------------------------------------------------
  // 6. User Profile Update in Supabase profiles table
  // ---------------------------------------------------------------------------
  async saveProfile(
    profileData: Partial<UserProfile>
  ): Promise<{ success: boolean; profile?: UserProfile; error?: string }> {
    const session = this.getSession();
    if (!session || !session.user) {
      return { success: false, error: 'User is not authenticated.' };
    }

    const authUserId = session.user.id || session.user.auth_user_id;
    const now = new Date().toISOString();

    const updatedProfile: UserProfile = {
      id: session.profile?.id || `prf_${Date.now()}`,
      auth_user_id: authUserId,
      full_name: (profileData.full_name ?? session.profile?.full_name ?? '').trim(),
      username: (profileData.username ?? session.profile?.username ?? '').trim().toLowerCase(),
      email: (profileData.email ?? session.profile?.email ?? session.user.email ?? '').trim().toLowerCase(),
      phone: (profileData.phone ?? session.profile?.phone ?? session.user.phone ?? '').trim(),
      profile_image_url: profileData.profile_image_url ?? session.profile?.profile_image_url ?? '',
      address: (profileData.address ?? session.profile?.address ?? '').trim(),
      language: profileData.language ?? session.profile?.language ?? 'English',
      currency: profileData.currency ?? session.profile?.currency ?? 'NPR',
      created_at: session.profile?.created_at || now,
      updated_at: now,
      is_profile_complete: true,
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .upsert({
            auth_user_id: authUserId,
            full_name: updatedProfile.full_name,
            username: updatedProfile.username,
            email: updatedProfile.email,
            phone: updatedProfile.phone,
            profile_image_url: updatedProfile.profile_image_url,
            address: updatedProfile.address,
            language: updatedProfile.language,
            currency: updatedProfile.currency,
            updated_at: now,
          }, { onConflict: 'auth_user_id' })
          .select()
          .single();

        if (error) {
          console.error('[authService] saveProfile Supabase error:', error);
          return {
            success: false,
            error: formatUserFriendlyError(error, 'Failed to save profile in database.'),
          };
        }

        if (data) {
          updatedProfile.id = data.id;
          updatedProfile.created_at = data.created_at;
          updatedProfile.updated_at = data.updated_at;
        }
      } catch (err: any) {
        console.error('[authService] saveProfile network error:', err);
        return {
          success: false,
          error: formatUserFriendlyError(err, 'Network error saving profile.'),
        };
      }
    }

    // Update active session and notify subscribers
    const newSession: AuthSession = {
      ...session,
      profile: updatedProfile,
    };
    this.setSession(newSession);

    return {
      success: true,
      profile: updatedProfile,
    };
  }
}

export const authService = new AuthService();
