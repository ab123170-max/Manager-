/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured, getSupabaseMissingVars } from '../lib/supabaseClient';
import { AuthSession, AuthUser, UserProfile, AuthProviderType } from '../types';

const STORAGE_KEYS = {
  ONBOARDING_COMPLETED: 'ais_onboarding_completed_v1',
  LAST_AVATAR_PATH: 'ais_last_avatar_path_v1',
  SESSION_CACHE: 'ais_auth_session_cache_v1', // Kept for cleanup on signout
};

type AuthListener = (session: AuthSession | null) => void;
const authListeners = new Set<AuthListener>();

type RecoveryListener = (isRecovery: boolean) => void;
const recoveryListeners = new Set<RecoveryListener>();

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

  if (msg.includes('invalid credentials') || msg.includes('invalid login credentials')) {
    return 'Invalid email or password. Please verify and try again.';
  }
  if (msg.includes('user already registered') || msg.includes('already exists') || msg.includes('already registered')) {
    return 'An account with this email already exists. Please log in instead.';
  }
  if (msg.includes('token has expired') || msg.includes('otp expired') || msg.includes('invalid otp')) {
    return 'Verification code has expired or is invalid. Please request a new code.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('security purposes')) {
    return 'Too many requests. For security purposes, please wait a few moments before trying again.';
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
  if (msg.includes('phone') && (msg.includes('format') || msg.includes('invalid'))) {
    return 'Invalid phone number format. Please include country code (e.g. +977 for Nepal).';
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
  emailConfirmationRequired?: boolean;
  message?: string;
  error?: string;
}

class AuthService {
  private activeSession: AuthSession | null = null;
  private isInitialized = false;
  private profilePromises = new Map<string, Promise<UserProfile | null>>();
  private isPasswordRecovery = false;

  constructor() {
    this.setupSupabaseAuthListener();
    this.checkInitialUrlHash();
  }

  private checkInitialUrlHash() {
    if (typeof window !== 'undefined' && window.location.hash) {
      if (window.location.hash.includes('type=recovery')) {
        this.isPasswordRecovery = true;
        setTimeout(() => notifyRecoveryListeners(true), 300);
      }
    }
  }

  /**
   * Initializes and listens for Supabase Auth state changes:
   * SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED, PASSWORD_RECOVERY.
   */
  private async setupSupabaseAuthListener(): Promise<void> {
    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      // 1. Check existing Supabase session on startup
      const { data: initialData, error: sessionErr } = await supabase.auth.getSession();
      if (!sessionErr && initialData?.session) {
        await this.handleSupabaseSession(initialData.session);
      } else {
        this.clearLocalSessionState();
      }

      // 2. Listen to real-time auth changes
      supabase.auth.onAuthStateChange(async (event, sbSession) => {
        if (event === 'PASSWORD_RECOVERY') {
          this.isPasswordRecovery = true;
          notifyRecoveryListeners(true);
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (sbSession) {
            await this.handleSupabaseSession(sbSession);
          }
        } else if (event === 'SIGNED_OUT') {
          this.clearLocalSessionState();
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
        displayName:
          sbUser.user_metadata?.full_name ||
          sbUser.user_metadata?.name ||
          sbUser.email?.split('@')[0] ||
          'Shopkeeper',
        photoURL: sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || '',
        createdAt: sbUser.created_at || new Date().toISOString(),
        lastLoginAt: sbUser.last_sign_in_at || new Date().toISOString(),
      };

      // Fetch profile from public.profiles table
      let profile = await this.fetchProfileFromDb(sbUser.id);

      // If profile does not exist, safely create one in public.profiles table
      if (!profile) {
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

  /**
   * Fetches user profile from Supabase profiles table with explicit columns.
   */
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
          .select('id, auth_user_id, full_name, username, email, phone, profile_image_url, address, language, currency, created_at, updated_at')
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
      } finally {
        this.profilePromises.delete(authUserId);
      }
    })();

    this.profilePromises.set(authUserId, promise);
    return promise;
  }

  /**
   * Safely creates an initial profile record in Supabase profiles table.
   * Handles concurrency where a database trigger might create the row simultaneously.
   */
  private async createDefaultProfile(sbUser: any): Promise<UserProfile | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const now = new Date().toISOString();
      const meta = sbUser.user_metadata || {};
      const defaultName = (meta.full_name || meta.name || '').trim();
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
        phone: sbUser.phone || meta.phone || '',
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
        .maybeSingle();

      if (error) {
        console.warn('[authService] createDefaultProfile insert failed, checking if already created by DB trigger:', error.message);
        // If a database trigger or another request already inserted the row, re-fetch
        const fallback = await this.fetchProfileFromDb(sbUser.id, true);
        if (fallback) return fallback;
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
      console.error('[authService] createDefaultProfile exception:', e);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Helper for unconfigured Supabase error message
  // ---------------------------------------------------------------------------
  private getUnconfiguredError(): string {
    const missing = getSupabaseMissingVars();
    return `Supabase authentication is not configured. Missing required environment variables: ${missing.join(', ')}. Please configure them in your environment settings.`;
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
    notifyAuthListeners(session);
  }

  private clearLocalSessionState(): void {
    this.activeSession = null;
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSION_CACHE);
    } catch {}
    notifyAuthListeners(null);
  }

  async clearSession(): Promise<void> {
    this.activeSession = null;
    this.isPasswordRecovery = false;
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
    notifyAuthListeners(null);
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

  isRecoveryMode(): boolean {
    return this.isPasswordRecovery;
  }

  setRecoveryMode(value: boolean): void {
    this.isPasswordRecovery = value;
    notifyRecoveryListeners(value);
  }

  // ---------------------------------------------------------------------------
  // 1. Email Registration (Sign Up)
  // ---------------------------------------------------------------------------
  async registerWithEmail({
    fullName,
    email,
    password,
    phone,
  }: RegisterEmailParams): Promise<AuthOperationResult> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: this.getUnconfiguredError(),
      };
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanPhone = phone?.trim() || undefined;

    if (!cleanName) {
      return { success: false, error: 'Please enter your full name.' };
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            phone: cleanPhone,
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        return {
          success: false,
          error: formatUserFriendlyError(error, 'Registration failed. Please try again.'),
        };
      }

      // Case 1: Supabase email confirmation is enabled (data.user exists, but no active session)
      if (data.user && !data.session) {
        return {
          success: true,
          emailConfirmationRequired: true,
          message:
            'Registration successful! Please check your email inbox to confirm your account before logging in.',
        };
      }

      // Case 2: Supabase returned an active session immediately
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
        message: 'Please check your email to complete registration.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: formatUserFriendlyError(err, 'An error occurred during registration.'),
      };
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Email Login (Sign In With Password)
  // ---------------------------------------------------------------------------
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
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password) {
      return { success: false, error: 'Please enter your password.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return {
          success: false,
          error: formatUserFriendlyError(error, 'Invalid email or password.'),
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
        error: 'Unable to establish an authenticated session. Please try again.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: formatUserFriendlyError(err, 'Email login error.'),
      };
    }
  }

  // Backward compatible alias
  async loginWithEmail(
    email: string,
    mode: 'login' | 'signup' = 'login',
    password?: string
  ): Promise<AuthOperationResult> {
    if (mode === 'signup') {
      return this.registerWithEmail({
        fullName: email.split('@')[0],
        email,
        password: password || 'TempPass123!',
      });
    }
    return this.loginWithEmailPassword(email, password || '');
  }

  // ---------------------------------------------------------------------------
  // 3. Forgot Password / Password Reset Flow
  // ---------------------------------------------------------------------------
  async resetPasswordForEmail(email: string): Promise<{ success: boolean; message: string; error?: string }> {
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
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin,
      });

      if (error) {
        // Only surface network or rate limit errors; don't leak user existence
        const msg = String(error.message || '').toLowerCase();
        if (msg.includes('rate limit') || msg.includes('too many')) {
          return {
            success: false,
            message: 'Too many requests. Please wait a few moments before trying again.',
            error: error.message,
          };
        }
        if (msg.includes('network') || msg.includes('fetch')) {
          return {
            success: false,
            message: 'Network connection error. Please verify your connection.',
            error: error.message,
          };
        }
      }

      return {
        success: true,
        message:
          'If an account exists for this email, a password reset link has been sent. Please check your inbox and spam folder.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: formatUserFriendlyError(err, 'Failed to send password reset email.'),
        error: err.message,
      };
    }
  }

  async updateUserPassword(newPassword: string): Promise<{ success: boolean; message: string; error?: string }> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        message: this.getUnconfiguredError(),
        error: 'SUPABASE_UNCONFIGURED',
      };
    }

    if (!newPassword || newPassword.length < 6) {
      return {
        success: false,
        message: 'Password must be at least 6 characters long.',
        error: 'PASSWORD_TOO_SHORT',
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
      notifyRecoveryListeners(false);

      return {
        success: true,
        message: 'Your password has been successfully updated. You can now log in.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: formatUserFriendlyError(err, 'Password update error.'),
        error: err.message,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Google & Facebook OAuth Authentication
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // 5. Email OTP Authentication
  // ---------------------------------------------------------------------------
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
          message: formatUserFriendlyError(error, 'Failed to send email verification code.'),
          error: error.message,
        };
      }

      return {
        success: true,
        message: `Verification code sent to ${cleanEmail}. Check your inbox and spam folder.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: formatUserFriendlyError(err, 'Network error while sending email code.'),
        error: err.message,
      };
    }
  }

  async verifyEmailOtp(
    email: string,
    otp: string
  ): Promise<AuthOperationResult> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: this.getUnconfiguredError(),
      };
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      return {
        success: false,
        error: 'Please enter the complete 6-digit verification code.',
      };
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanOtp,
        type: 'email',
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
        error: 'Verification succeeded but session could not be established. Please try again.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: formatUserFriendlyError(err, 'Network error while verifying OTP code.'),
      };
    }
  }


  // ---------------------------------------------------------------------------
  // 6. WhatsApp Status Check
  // ---------------------------------------------------------------------------
  async checkWhatsAppStatus(): Promise<{ success: boolean; message: string; error?: string }> {
    return {
      success: false,
      message: 'WhatsApp Business API is not configured on this project. Please sign in with Email, Google, Facebook, or Mobile Phone SMS.',
      error: 'WHATSAPP_UNAVAILABLE',
    };
  }

  // ---------------------------------------------------------------------------
  // 7. Supabase Storage Profile Photo Upload & Replacement
  // ---------------------------------------------------------------------------
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
  // 8. User Profile Update in Supabase profiles table
  // ---------------------------------------------------------------------------
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

    const updatedProfile: UserProfile = {
      id: session.profile?.id || '',
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

    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          {
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
          },
          { onConflict: 'auth_user_id' }
        )
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

    // Update active session and notify subscribers
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
