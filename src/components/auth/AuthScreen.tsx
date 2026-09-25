/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Camera,
  AlertTriangle,
  ChevronDown,
  KeyRound,
} from 'lucide-react';
import { authService, subscribePasswordRecovery } from '../../services/authService';
import { isSupabaseConfigured, getSupabaseMissingVars } from '../../lib/supabaseClient';
import { AuthSession } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSelectorButton } from '../common/LanguageSelectorButton';

export type AuthScreenView =
  | 'login'
  | 'register'
  | 'forgot_password'
  | 'reset_password'
  | 'email_otp';

interface AuthScreenProps {
  initialMode?: 'login' | 'signup' | 'forgot_password';
  onSuccess: (session: AuthSession, isNewUser: boolean) => void;
  onBackToLanding: () => void;
}

interface CountryCode {
  country: string;
  code: string;
  flag: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { country: 'Nepal', code: '+977', flag: '🇳🇵' },
  { country: 'India', code: '+91', flag: '🇮🇳' },
  { country: 'United States', code: '+1', flag: '🇺🇸' },
  { country: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { country: 'United Arab Emirates', code: '+971', flag: '🇦🇪' },
  { country: 'Australia', code: '+61', flag: '🇦🇺' },
  { country: 'Canada', code: '+1', flag: '🇨🇦' },
];

export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialMode = 'login',
  onSuccess,
  onBackToLanding,
}) => {
  const { t } = useLanguage();
  const [view, setView] = useState<AuthScreenView>(() => {
    if (authService.isRecoveryMode()) return 'reset_password';
    return initialMode === 'signup' ? 'register' : 'login';
  });

  // Supabase Configuration status
  const supabaseReady = isSupabaseConfigured();
  const missingVars = getSupabaseMissingVars();

  // Common UI State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);

  // Register Form State
  const [regFullName, setRegFullName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState<boolean>(false);
  const [regPhoneCountryCode, setRegPhoneCountryCode] = useState<string>('+977');
  const [regPhoneNumber, setRegPhoneNumber] = useState<string>('');

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [forgotSubmitted, setForgotSubmitted] = useState<boolean>(false);

  // Set New Password State (Password Recovery)
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState<boolean>(false);

  // Email OTP State
  const [otpEmail, setOtpEmail] = useState<string>('');
  const [otpStep, setOtpStep] = useState<'enter_email' | 'enter_otp'>('enter_email');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState<number>(0);

  // Listen for Password Recovery events (e.g. user clicked recovery link in email)
  useEffect(() => {
    const unsub = subscribePasswordRecovery((isRecovery) => {
      if (isRecovery) {
        setView('reset_password');
        clearFeedback();
      }
    });
    return unsub;
  }, []);

  // OTP Countdown timer
  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const clearFeedback = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setInfoMessage(null);
  };

  const switchView = (newView: AuthScreenView) => {
    clearFeedback();
    setView(newView);
  };

  // ---------------------------------------------------------------------------
  // 1. Email + Password Login
  // ---------------------------------------------------------------------------
  const handleEmailLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!supabaseReady) {
      setErrorMessage(
        `Supabase authentication is not configured. Missing environment variables: ${missingVars.join(
          ', '
        )}. Please configure them in your settings.`
      );
      return;
    }

    if (!loginEmail.trim() || !loginPassword) {
      setErrorMessage('Please enter both email address and password.');
      return;
    }

    setIsLoading(true);
    setLoadingText('Signing in…');

    try {
      const res = await authService.loginWithEmailPassword(loginEmail, loginPassword);
      if (res.success && res.session) {
        setSuccessMessage('Login successful! Loading your store…');
        setTimeout(() => {
          onSuccess(res.session!, res.isNewUser ?? false);
        }, 300);
      } else {
        setErrorMessage(res.error || 'Failed to sign in. Please verify your credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 2. Email Registration
  // ---------------------------------------------------------------------------
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!supabaseReady) {
      setErrorMessage(
        `Supabase authentication is not configured. Missing environment variables: ${missingVars.join(
          ', '
        )}. Please configure them in your settings.`
      );
      return;
    }

    if (!regFullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!regEmail.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    // Optional phone number formatting
    let cleanFullPhone: string | undefined = undefined;
    if (regPhoneNumber.trim()) {
      const cleanNum = regPhoneNumber.replace(/[^0-9]/g, '');
      if (cleanNum.length >= 7) {
        cleanFullPhone = `${regPhoneCountryCode}${cleanNum}`;
      }
    }

    setIsLoading(true);
    setLoadingText('Creating your account…');

    try {
      const res = await authService.registerWithEmail({
        fullName: regFullName,
        email: regEmail,
        password: regPassword,
        phone: cleanFullPhone,
      });

      if (res.success) {
        if (res.emailConfirmationRequired) {
          setInfoMessage(
            res.message ||
              'Registration successful! Please check your email inbox to confirm your account, then return here to sign in.'
          );
          setRegPassword('');
          setRegConfirmPassword('');
        } else if (res.session) {
          setSuccessMessage('Account created successfully! Welcome to ScanMe AI.');
          setTimeout(() => {
            onSuccess(res.session!, true);
          }, 300);
        }
      } else {
        setErrorMessage(res.error || 'Registration could not be completed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during account creation.');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 3. Forgot Password
  // ---------------------------------------------------------------------------
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!supabaseReady) {
      setErrorMessage(
        `Supabase authentication is not configured. Missing environment variables: ${missingVars.join(
          ', '
        )}.`
      );
      return;
    }

    if (!forgotEmail.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setLoadingText('Sending reset link…');

    try {
      const res = await authService.resetPasswordForEmail(forgotEmail);
      if (res.success) {
        setForgotSubmitted(true);
        setSuccessMessage(res.message);
      } else {
        setErrorMessage(res.message || res.error || 'Failed to send password reset email.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while requesting password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. Update Password (Recovery Form)
  // ---------------------------------------------------------------------------
  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!supabaseReady) {
      setErrorMessage(
        `Supabase authentication is not configured. Missing environment variables: ${missingVars.join(
          ', '
        )}.`
      );
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    setLoadingText('Updating password…');

    try {
      const res = await authService.updateUserPassword(newPassword);
      if (res.success) {
        setSuccessMessage('Password updated successfully! You can now log in with your new password.');
        setTimeout(() => {
          setView('login');
          setLoginPassword('');
        }, 1500);
      } else {
        setErrorMessage(res.message || res.error || 'Failed to update password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Password update failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Google OAuth Login
  // ---------------------------------------------------------------------------
  const handleGoogleLogin = async () => {
    clearFeedback();

    if (!supabaseReady) {
      setErrorMessage(
        `Supabase OAuth is not configured. Missing environment variables: ${missingVars.join(
          ', '
        )}.`
      );
      return;
    }

    setIsLoading(true);
    setLoadingText('Connecting to Google…');

    try {
      const res = await authService.loginWithOAuth('google');
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to initiate Google sign-in.');
        setIsLoading(false);
      }
      // Browser redirects to Google OAuth
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in was interrupted.');
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 6. Facebook OAuth Login
  // ---------------------------------------------------------------------------
  const handleFacebookLogin = async () => {
    clearFeedback();

    if (!supabaseReady) {
      setErrorMessage(
        `Supabase OAuth is not configured. Missing environment variables: ${missingVars.join(
          ', '
        )}.`
      );
      return;
    }

    setIsLoading(true);
    setLoadingText('Connecting to Facebook…');

    try {
      const res = await authService.loginWithOAuth('facebook');
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to initiate Facebook sign-in.');
        setIsLoading(false);
      }
      // Browser redirects to Facebook OAuth
    } catch (err: any) {
      setErrorMessage(err.message || 'Facebook authentication error.');
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 7. Email OTP Flow
  // ---------------------------------------------------------------------------
  const handleSendEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    clearFeedback();

    if (!supabaseReady) {
      setErrorMessage(
        `Supabase Email Auth is not configured. Missing environment variables: ${missingVars.join(
          ', '
        )}.`
      );
      return;
    }

    const cleanEmail = otpEmail.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setLoadingText('Sending email verification code…');

    try {
      const res = await authService.sendEmailOtp(cleanEmail);
      if (res.success) {
        setOtpEmail(cleanEmail);
        setOtpStep('enter_otp');
        setResendTimer(60);
        setOtpDigits(['', '', '', '', '', '']);
        setSuccessMessage(res.message);
      } else {
        setErrorMessage(res.message || res.error || 'Failed to send email verification code.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error while sending email code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    clearFeedback();

    if (!supabaseReady) {
      setErrorMessage('Supabase is not configured.');
      return;
    }

    const fullCode = otpDigits.join('');
    if (fullCode.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit code received by email.');
      return;
    }

    setIsLoading(true);
    setLoadingText('Verifying code with Supabase…');

    try {
      const res = await authService.verifyEmailOtp(otpEmail, fullCode);

      if (res.success && res.session) {
        setSuccessMessage('Email verified! Loading your store…');
        setTimeout(() => {
          onSuccess(res.session!, res.isNewUser ?? false);
        }, 300);
      } else {
        setErrorMessage(res.error || 'Invalid or expired verification code. Please check and try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpDigitChange = (index: number, val: string) => {
    const digit = val.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    if (digit && index < 5) {
      const nextInput = document.getElementById(`email-otp-input-${index + 1}`);
      nextInput?.focus();
    }

    if (digit && index === 5 && newDigits.every((d) => d !== '')) {
      setTimeout(() => handleVerifyEmailOtp(), 100);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`email-otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);

    if (pasted.length === 6) {
      setTimeout(() => handleVerifyEmailOtp(), 100);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Top Header with Back Navigation & Branding */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (view === 'login') {
                onBackToLanding();
              } else {
                switchView('login');
              }
            }}
            id="btn-auth-back"
            className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{view === 'login' ? 'Back to Home' : 'Back to Login'}</span>
          </button>

          <div className="flex items-center gap-2">
            <LanguageSelectorButton variant="pill" />
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-8 rounded-xl bg-[#1473EA] flex items-center justify-center text-white shadow-sm shadow-[#1473EA]/20">
                <Camera className="w-4 h-4" />
              </div>
              <span className="font-black text-sm tracking-tight text-[#092B4C] hidden sm:inline">
                ScanMe AI
              </span>
            </div>
          </div>
        </div>

        {/* Main Card Container */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80">
          {/* Unconfigured Supabase Warning Banner */}
          {!supabaseReady && (
            <div className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Supabase Configuration Required</span>
              </div>
              <p className="text-amber-800/90 leading-relaxed">
                ScanMe AI uses Supabase Auth for all logins, registrations, and database operations.
                The following required environment variables are currently missing:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {missingVars.map((v) => (
                  <code
                    key={v}
                    className="px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-950 font-mono text-[11px] font-bold border border-amber-300"
                  >
                    {v}
                  </code>
                ))}
              </div>
              <p className="text-[11px] text-amber-700/80 pt-1">
                Please set these environment variables in your deployment or environment settings.
              </p>
            </div>
          )}

          {/* Feedback Banners */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {infoMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5 animate-in fade-in">
              <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{infoMessage}</div>
            </div>
          )}

          {/* ================================================================= */}
          {/* VIEW 1: LOGIN                                                    */}
          {/* ================================================================= */}
          {view === 'login' && (
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-[#092B4C] tracking-tight">
                  Welcome to ScanMe AI
                </h2>
                <p className="text-xs text-slate-500">
                  Sign in with your email and password to access your inventory
                </p>
              </div>

              {/* Email + Password Form */}
              <form onSubmit={handleEmailLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#092B4C] mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="e.g. shop@example.com"
                      disabled={isLoading}
                      id="input-login-email"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1473EA]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#092B4C]">Password</label>
                    <button
                      type="button"
                      onClick={() => switchView('forgot_password')}
                      id="btn-goto-forgot"
                      className="text-[11px] font-bold text-[#1473EA] hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      disabled={isLoading}
                      id="input-login-password"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1473EA]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showLoginPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !loginEmail.trim() || !loginPassword}
                  id="btn-submit-login"
                  className="w-full py-3.5 rounded-2xl bg-[#1473EA] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-[#1473EA]/20 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{loadingText || 'Signing in…'}</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span className="bg-white px-3">or continue with</span>
                </div>
              </div>

              {/* Social & Alternative Auth Methods */}
              <div className="space-y-2.5">
                {/* Google OAuth Button */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  id="btn-login-google"
                  className="w-full py-3 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-800 flex items-center justify-center gap-3 transition-all active:scale-98 disabled:opacity-50 shadow-sm"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* Facebook OAuth Button */}
                <button
                  type="button"
                  onClick={handleFacebookLogin}
                  disabled={isLoading}
                  id="btn-login-facebook"
                  className="w-full py-3 px-4 rounded-2xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-xs flex items-center justify-center gap-3 transition-all active:scale-98 disabled:opacity-50 shadow-sm shadow-[#1877F2]/20"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Continue with Facebook</span>
                </button>

                {/* Email OTP Button */}
                <button
                  type="button"
                  onClick={() => switchView('email_otp')}
                  disabled={isLoading}
                  id="btn-login-email-otp"
                  className="w-full py-3 px-4 rounded-2xl bg-[#092B4C] hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-3 transition-all active:scale-98 disabled:opacity-50 shadow-sm"
                >
                  <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Continue with Email OTP</span>
                </button>
              </div>

              {/* Link to Register */}
              <div className="pt-2 text-center text-xs text-slate-500">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchView('register')}
                  id="link-goto-register"
                  className="font-bold text-[#1473EA] hover:underline"
                >
                  Create an account
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* VIEW 2: REGISTER                                                 */}
          {/* ================================================================= */}
          {view === 'register' && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-[#092B4C] tracking-tight">
                  Create Your Account
                </h2>
                <p className="text-xs text-slate-500">
                  Register with ScanMe AI to scan barcodes and manage stock
                </p>
              </div>

              {/* Register Form */}
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-[#092B4C] mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="e.g. Ramesh Shrestha"
                      disabled={isLoading}
                      id="input-register-fullname"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1473EA]"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-[#092B4C] mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. ramesh@example.com"
                      disabled={isLoading}
                      id="input-register-email"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1473EA]"
                    />
                  </div>
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#092B4C] mb-1">
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        disabled={isLoading}
                        id="input-register-password"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1473EA]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        tabIndex={-1}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        {showRegPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#092B4C] mb-1">
                      Confirm Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showRegConfirmPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        disabled={isLoading}
                        id="input-register-confirm"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1473EA]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                        tabIndex={-1}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        {showRegConfirmPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Phone Number (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-[#092B4C] mb-1">
                    Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative shrink-0">
                      <select
                        value={regPhoneCountryCode}
                        onChange={(e) => setRegPhoneCountryCode(e.target.value)}
                        className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5 text-xs font-bold text-slate-800 pr-7 focus:outline-none focus:ring-2 focus:ring-[#1473EA]"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code + c.country} value={c.code}>
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <input
                      type="tel"
                      value={regPhoneNumber}
                      onChange={(e) => setRegPhoneNumber(e.target.value)}
                      placeholder="e.g. 9841234567"
                      disabled={isLoading}
                      id="input-register-phone"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1473EA]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    isLoading ||
                    !regFullName.trim() ||
                    !regEmail.trim() ||
                    !regPassword ||
                    !regConfirmPassword
                  }
                  id="btn-submit-register"
                  className="w-full py-3.5 rounded-2xl bg-[#1473EA] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-[#1473EA]/20 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{loadingText || 'Registering…'}</span>
                    </>
                  ) : (
                    <>
                      <span>Register Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span className="bg-white px-3">or continue with</span>
                </div>
              </div>

              {/* Social Options on Register */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  id="btn-register-google"
                  className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-800 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={handleFacebookLogin}
                  disabled={isLoading}
                  id="btn-register-facebook"
                  className="py-2.5 px-3 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Facebook</span>
                </button>
              </div>

              {/* Link to Login */}
              <div className="pt-2 text-center text-xs text-slate-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  id="link-goto-login"
                  className="font-bold text-[#1473EA] hover:underline"
                >
                  Log in
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* VIEW 3: FORGOT PASSWORD                                          */}
          {/* ================================================================= */}
          {view === 'forgot_password' && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1473EA] flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#092B4C] tracking-tight">
                  Forgot Password
                </h2>
                <p className="text-xs text-slate-500">
                  Enter your registered email and we&apos;ll send you a password reset link
                </p>
              </div>

              {!forgotSubmitted ? (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#092B4C] mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="e.g. user@example.com"
                        disabled={isLoading}
                        id="input-forgot-email"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1473EA]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !forgotEmail.trim()}
                    id="btn-submit-forgot"
                    className="w-full py-3.5 rounded-2xl bg-[#1473EA] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-[#1473EA]/20 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{loadingText || 'Sending reset email…'}</span>
                      </>
                    ) : (
                      <>
                        <span>Send Password Reset Link</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => switchView('login')}
                    className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    Cancel and Return to Login
                  </button>
                </form>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-2">
                    <p className="font-bold">Check Your Email</p>
                    <p className="text-blue-800/80 leading-relaxed">
                      If an account exists for <strong className="text-blue-950">{forgotEmail}</strong>,
                      you will receive an email shortly with a secure password reset link.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotSubmitted(false);
                      switchView('login');
                    }}
                    id="btn-forgot-return-login"
                    className="w-full py-3 rounded-2xl bg-[#092B4C] hover:bg-slate-900 text-white font-bold text-xs transition-colors"
                  >
                    Return to Login
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* VIEW 4: RESET PASSWORD (Set New Password)                         */}
          {/* ================================================================= */}
          {view === 'reset_password' && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#092B4C] tracking-tight">
                  Set New Password
                </h2>
                <p className="text-xs text-slate-500">
                  Choose a secure new password for your account
                </p>
              </div>

              <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#092B4C] mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      disabled={isLoading}
                      id="input-reset-new-password"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1473EA]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#092B4C] mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      disabled={isLoading}
                      id="input-reset-confirm-password"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1473EA]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showConfirmNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !newPassword || !confirmNewPassword}
                  id="btn-submit-update-password"
                  className="w-full py-3.5 rounded-2xl bg-[#1473EA] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-[#1473EA]/20 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating password…</span>
                    </>
                  ) : (
                    <>
                      <span>Update Password</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ================================================================= */}
          {/* VIEW 5: EMAIL OTP                                                 */}
          {/* ================================================================= */}
          {view === 'email_otp' && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1473EA] flex items-center justify-center mx-auto mb-2">
                  <Mail className="w-6 h-6" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#092B4C] tracking-tight">
                  Sign In with Email OTP
                </h2>
                <p className="text-xs text-slate-500">
                  {otpStep === 'enter_email'
                    ? 'We will send a 6-digit verification code to your email'
                    : `Enter the 6-digit code sent to ${otpEmail}`}
                </p>
              </div>

              {otpStep === 'enter_email' ? (
                <form onSubmit={handleSendEmailOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#092B4C] mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        value={otpEmail}
                        onChange={(e) => setOtpEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoFocus
                        autoComplete="email"
                        disabled={isLoading}
                        id="input-email-otp"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-10 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1473EA]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !otpEmail.trim()}
                    id="btn-send-email-otp"
                    className="w-full py-3.5 rounded-2xl bg-[#1473EA] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-[#1473EA]/20 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{loadingText || 'Sending code…'}</span>
                      </>
                    ) : (
                      <>
                        <span>Send OTP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => switchView('login')}
                    className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    Return to Login
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span>Sent to: <strong className="text-slate-800">{otpEmail}</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpStep('enter_email');
                        clearFeedback();
                      }}
                      className="font-bold text-[#1473EA] hover:underline"
                    >
                      Change Email
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-2 py-2">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`email-otp-input-${idx}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={idx === 0 ? handleOtpPaste : undefined}
                        autoFocus={idx === 0}
                        className="w-11 h-13 text-center text-lg font-black bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1473EA] text-[#092B4C]"
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpDigits.some((d) => !d)}
                    id="btn-verify-email-otp"
                    className="w-full py-3.5 rounded-2xl bg-[#1473EA] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-[#1473EA]/20 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying…</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Sign In</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    {resendTimer > 0 ? (
                      <span className="text-xs text-slate-400">
                        Resend available in <strong className="text-slate-700">{resendTimer}s</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendEmailOtp()}
                        disabled={isLoading}
                        className="text-xs font-bold text-[#1473EA] hover:underline flex items-center justify-center gap-1.5 mx-auto"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Resend OTP</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => switchView('login')}
                    className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    Return to Login
                  </button>
                </form>
              )}
            </div>
          )}


          {/* Security Note Footer */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>Supabase Authenticated • Passwords securely encrypted with bcrypt</span>
          </div>
        </div>
      </div>
    </div>
  );
};
