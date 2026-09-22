/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Phone,
  Mail,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Camera,
  Info,
  ChevronDown,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { AuthSession } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSelectorButton } from '../common/LanguageSelectorButton';

interface AuthScreenProps {
  initialMode?: 'login' | 'signup';
  onSuccess: (session: AuthSession, isNewUser: boolean) => void;
  onBackToLanding: () => void;
}

type AuthMethod = 'select' | 'phone' | 'email' | 'whatsapp';

interface CountryCode {
  country: string;
  code: string;
  flag: string;
  example: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { country: 'Nepal', code: '+977', flag: '🇳🇵', example: '9841234567' },
  { country: 'India', code: '+91', flag: '🇮🇳', example: '9876543210' },
  { country: 'United States', code: '+1', flag: '🇺🇸', example: '2025550143' },
  { country: 'United Kingdom', code: '+44', flag: '🇬🇧', example: '7911123456' },
  { country: 'United Arab Emirates', code: '+971', flag: '🇦🇪', example: '501234567' },
  { country: 'Australia', code: '+61', flag: '🇦🇺', example: '412345678' },
  { country: 'Canada', code: '+1', flag: '🇨🇦', example: '4165550198' },
];

export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialMode = 'login',
  onSuccess,
  onBackToLanding,
}) => {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'login' | 'signup'>(initialMode);
  const [method, setMethod] = useState<AuthMethod>('select');

  // Phone OTP Flow State
  const [countryCode, setCountryCode] = useState<string>('+977');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [otpStep, setOtpStep] = useState<'enter_phone' | 'enter_otp'>('enter_phone');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState<number>(0);
  const [otpSentPhone, setOtpSentPhone] = useState<string>('');
  const [previewOtpNotice, setPreviewOtpNotice] = useState<string | null>(null);

  // Email Flow State
  const [emailAddress, setEmailAddress] = useState<string>('');

  // General Loading & Status State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // WhatsApp Alert Dialog
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState<boolean>(false);
  const [whatsAppStatusMsg, setWhatsAppStatusMsg] = useState<string>('');

  // Resend OTP countdown timer
  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessNotice(null);
    setPreviewOtpNotice(null);
  };

  // ---------------------------------------------------------------------------
  // 1. Google OAuth
  // ---------------------------------------------------------------------------
  const handleGoogleLogin = async () => {
    clearMessages();
    setIsLoading(true);
    setLoadingText('Connecting to Google…');
    try {
      // Simulate real OAuth provider flow or Google Identity
      const result = await authService.loginWithOAuth('google', {
        name: tab === 'signup' ? 'Google User' : undefined,
        email: `google_${Date.now()}@gmail.com`,
      });

      if (result.success && result.session) {
        setSuccessNotice('Signed in with Google.');
        setTimeout(() => {
          onSuccess(result.session!, result.isNewUser ?? false);
        }, 300);
      } else {
        setErrorMessage(result.error || 'Unable to sign in with Google. Please try again.');
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Google sign-in was cancelled.');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 2. Facebook OAuth
  // ---------------------------------------------------------------------------
  const handleFacebookLogin = async () => {
    clearMessages();
    setIsLoading(true);
    setLoadingText('Connecting to Facebook…');
    try {
      const result = await authService.loginWithOAuth('facebook', {
        name: tab === 'signup' ? 'Facebook User' : undefined,
        email: `facebook_${Date.now()}@facebook.com`,
      });

      if (result.success && result.session) {
        setSuccessNotice('Signed in with Facebook.');
        setTimeout(() => {
          onSuccess(result.session!, result.isNewUser ?? false);
        }, 300);
      } else {
        setErrorMessage(result.error || 'Unable to sign in with Facebook. Please try again.');
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Facebook authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 3. WhatsApp Auth (Checks provider support, never fakes authentication)
  // ---------------------------------------------------------------------------
  const handleWhatsAppClick = async () => {
    clearMessages();
    setIsLoading(true);
    setLoadingText('Checking WhatsApp Gateway…');
    try {
      const check = await authService.checkWhatsAppStatus();
      if (!check.success) {
        setWhatsAppStatusMsg(check.message);
        setWhatsAppModalOpen(true);
      } else {
        setSuccessNotice('WhatsApp Gateway verified.');
      }
    } catch (e: any) {
      setWhatsAppStatusMsg('WhatsApp Business API credentials are not configured on this server.');
      setWhatsAppModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. Mobile Number OTP Flow
  // ---------------------------------------------------------------------------
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    clearMessages();

    const cleanNum = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanNum.length < 7) {
      setErrorMessage('Please enter a valid mobile number (at least 7 digits).');
      return;
    }

    setIsLoading(true);
    setLoadingText('Sending verification code…');

    try {
      const res = await authService.sendPhoneOtp(countryCode, cleanNum);
      if (res.success) {
        setOtpSentPhone(`${countryCode} ${cleanNum}`);
        setOtpStep('enter_otp');
        setResendTimer(45);
        setOtpDigits(['', '', '', '', '', '']);
        setSuccessNotice(res.message);
        if (res.previewCode) {
          setPreviewOtpNotice(`Development verification code: ${res.previewCode}`);
        }
      } else {
        setErrorMessage(res.error || res.message || 'Failed to send verification code.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network connection unavailable. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    clearMessages();

    const fullCode = otpDigits.join('');
    if (fullCode.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setLoadingText('Verifying your number…');

    try {
      const cleanNum = phoneNumber.replace(/[^0-9]/g, '');
      const res = await authService.verifyPhoneOtp(countryCode, cleanNum, fullCode);

      if (res.success && res.session) {
        setSuccessNotice('Verification successful!');
        setTimeout(() => {
          onSuccess(res.session!, res.isNewUser ?? false);
        }, 300);
      } else {
        setErrorMessage(res.error || 'Invalid verification code. Please check and try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to verify code.');
    } finally {
      setIsLoading(false);
    }
  };

  // OTP digit input change handler
  const handleOtpDigitChange = (index: number, val: string) => {
    const digit = val.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    // Auto-advance focus to next box
    if (digit && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }

    // If 6th digit entered, auto submit
    if (digit && index === 5 && newDigits.every((d) => d !== '')) {
      setTimeout(() => {
        handleVerifyOtp();
      }, 100);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Email Login / Signup
  // ---------------------------------------------------------------------------
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    const cleanEmail = emailAddress.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setLoadingText(tab === 'signup' ? 'Creating account with email…' : 'Logging in with email…');

    try {
      const res = await authService.loginWithEmail(cleanEmail, tab);
      if (res.success && res.session) {
        setSuccessNotice('Email authentication successful.');
        setTimeout(() => {
          onSuccess(res.session!, res.isNewUser ?? false);
        }, 300);
      } else {
        setErrorMessage(res.error || 'Email authentication failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to authenticate email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Top Back Navigation & Logo & Language */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={method === 'select' ? onBackToLanding : () => setMethod('select')}
            className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{method === 'select' ? t('common.back') : t('common.back')}</span>
          </button>

          <div className="flex items-center gap-2">
            <LanguageSelectorButton variant="pill" />
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-8 rounded-xl bg-[#1473EA] flex items-center justify-center text-white shadow-sm shadow-[#1473EA]/20">
                <Camera className="w-4 h-4" />
              </div>
              <span className="font-black text-sm tracking-tight text-[#092B4C] hidden sm:inline">SmartStock</span>
            </div>
          </div>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80">
          {/* Top Tabs: LOGIN vs SIGN UP */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                clearMessages();
              }}
              id="tab-login"
              className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                tab === 'login'
                  ? 'bg-white text-[#092B4C] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t('auth.login').toUpperCase()}
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('signup');
                clearMessages();
              }}
              id="tab-signup"
              className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                tab === 'signup'
                  ? 'bg-white text-[#092B4C] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t('auth.signup').toUpperCase()}
            </button>
          </div>

          {/* Heading */}
          <div className="text-center mb-6 space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-[#092B4C] tracking-tight">
              {tab === 'login' ? t('auth.welcome') : t('auth.createAccount')}
            </h2>
            <p className="text-xs text-slate-500">
              {tab === 'login'
                ? t('auth.welcomeSubtitle')
                : t('landing.heroSubtitle')}
            </p>
          </div>

          {/* Error / Feedback Banners */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {successNotice && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successNotice}</div>
            </div>
          )}

          {previewOtpNotice && (
            <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="font-mono font-bold">{previewOtpNotice}</span>
            </div>
          )}

          {/* METHOD 1: Main Provider Selection List */}
          {method === 'select' && (
            <div className="space-y-3">
              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                id="btn-auth-google"
                className="w-full py-3.5 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-800 flex items-center justify-center gap-3 transition-all active:scale-98 disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                <span>{t('auth.google')}</span>
              </button>

              {/* Facebook Button */}
              <button
                type="button"
                onClick={handleFacebookLogin}
                disabled={isLoading}
                id="btn-auth-facebook"
                className="w-full py-3.5 px-4 rounded-2xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-xs flex items-center justify-center gap-3 transition-all active:scale-98 disabled:opacity-50 shadow-sm shadow-[#1877F2]/20"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>{t('auth.facebook')}</span>
              </button>

              {/* Mobile Number Button */}
              <button
                type="button"
                onClick={() => {
                  setMethod('phone');
                  clearMessages();
                }}
                disabled={isLoading}
                id="btn-auth-phone"
                className="w-full py-3.5 px-4 rounded-2xl bg-[#092B4C] hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-3 transition-all active:scale-98 disabled:opacity-50 shadow-sm"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>{t('auth.mobile')}</span>
              </button>

              {/* WhatsApp Button */}
              <button
                type="button"
                onClick={handleWhatsAppClick}
                disabled={isLoading}
                id="btn-auth-whatsapp"
                className="w-full py-3.5 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs flex items-center justify-center gap-3 transition-all active:scale-98 disabled:opacity-50 shadow-sm shadow-[#25D366]/20"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                <span>{t('auth.whatsapp')}</span>
              </button>

              {/* Email Button */}
              <button
                type="button"
                onClick={() => {
                  setMethod('email');
                  clearMessages();
                }}
                disabled={isLoading}
                id="btn-auth-email"
                className="w-full py-3.5 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-3 transition-all active:scale-98 disabled:opacity-50"
              >
                <Mail className="w-4 h-4 text-slate-500" />
                <span>{t('auth.email')}</span>
              </button>
            </div>
          )}

          {/* METHOD 2: Mobile Number OTP Flow */}
          {method === 'phone' && (
            <div className="space-y-4">
              {otpStep === 'enter_phone' ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#092B4C] mb-1.5">
                      Mobile Number
                    </label>
                    <div className="flex gap-2">
                      {/* Country Code Dropdown */}
                      <div className="relative shrink-0">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs font-bold text-slate-800 pr-8 focus:outline-none focus:ring-2 focus:ring-[#1473EA]"
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.code + c.country} value={c.code}>
                              {c.flag} {c.code} ({c.country})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      {/* Phone Input */}
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="e.g. 9841234567"
                        autoFocus
                        disabled={isLoading}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1473EA]"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Default: Nepal (+977). A 6-digit verification code will be sent.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !phoneNumber.trim()}
                    id="btn-send-otp"
                    className="w-full py-3.5 rounded-2xl bg-[#1473EA] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-[#1473EA]/20 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{loadingText || 'Sending code…'}</span>
                      </>
                    ) : (
                      <>
                        <span>Send Verification Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Enter 6-digit OTP step */
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="text-center space-y-1">
                    <p className="text-xs text-slate-500">
                      Enter the 6-digit verification code sent to
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-bold text-xs text-[#092B4C]">{otpSentPhone}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpStep('enter_phone');
                          clearMessages();
                        }}
                        className="text-[11px] font-bold text-[#1473EA] hover:underline"
                      >
                        Change Number
                      </button>
                    </div>
                  </div>

                  {/* 6 Digit Input Boxes */}
                  <div className="flex items-center justify-center gap-2 py-2">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`otp-input-${idx}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        autoFocus={idx === 0}
                        className="w-11 h-13 text-center text-lg font-black bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1473EA] focus:border-[#1473EA] text-[#092B4C]"
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpDigits.some((d) => !d)}
                    id="btn-verify-otp"
                    className="w-full py-3.5 rounded-2xl bg-[#1473EA] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-[#1473EA]/20 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{loadingText || 'Verifying your number…'}</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Resend Timer & Button */}
                  <div className="text-center pt-1">
                    {resendTimer > 0 ? (
                      <span className="text-xs text-slate-400">
                        Resend code in <strong className="text-slate-700">{resendTimer}s</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendOtp()}
                        disabled={isLoading}
                        className="text-xs font-bold text-[#1473EA] hover:underline flex items-center justify-center gap-1.5 mx-auto"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Resend OTP Code</span>
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          {/* METHOD 3: Email Flow */}
          {method === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#092B4C] mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="e.g. user@example.com"
                  autoFocus
                  disabled={isLoading}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1473EA]"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !emailAddress.trim()}
                id="btn-submit-email"
                className="w-full py-3.5 rounded-2xl bg-[#1473EA] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-[#1473EA]/20 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{loadingText}</span>
                  </>
                ) : (
                  <>
                    <span>{tab === 'signup' ? 'Create Account' : 'Sign In with Email'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Bottom Security Note */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>Encrypted Session • Passwords never stored unhashed</span>
          </div>
        </div>
      </div>

      {/* WhatsApp Unavailable Modal */}
      {whatsAppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#25D366] flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-[#092B4C]">WhatsApp Verification</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{whatsAppStatusMsg}</p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setWhatsAppModalOpen(false);
                  setMethod('phone');
                }}
                className="w-full py-2.5 rounded-xl bg-[#1473EA] text-white text-xs font-bold hover:bg-blue-600 transition-colors"
              >
                Continue with Mobile Number OTP
              </button>
              <button
                type="button"
                onClick={() => setWhatsAppModalOpen(false)}
                className="w-full py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-bold"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
