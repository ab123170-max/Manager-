/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Globe,
  Coins,
  ArrowRight,
  ShieldCheck,
  X,
  Store,
  LogIn,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { UserProfile, AuthUser, PendingOnboardingProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { SupportedLanguage } from '../../translations';

export interface ProfileSetupViewProps {
  user?: AuthUser | null;
  initialProfile?: UserProfile | null;
  initialPending?: PendingOnboardingProfile | null;
  isPreAuthOnboarding?: boolean; // True when collecting profile details BEFORE authentication
  isInitialSetup?: boolean;
  onContinueToAuth?: (pending: PendingOnboardingProfile) => void;
  onProfileSaved?: (profile: UserProfile) => void;
  onGoToLogin?: () => void;
  onCancel?: () => void;
}

const LANGUAGES: { code: SupportedLanguage; label: string }[] = [
  { code: 'ne', label: '🇳🇵 नेपाली (Nepali)' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'hi', label: '🇮🇳 हिन्दी (Hindi)' },
];

const CURRENCIES = [
  { code: 'NPR', symbol: 'रु', label: 'NPR - Nepalese Rupee (रु)' },
  { code: 'INR', symbol: '₹', label: 'INR - Indian Rupee (₹)' },
  { code: 'USD', symbol: '$', label: 'USD - US Dollar ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR - Euro (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP - British Pound (£)' },
  { code: 'AED', symbol: 'د.إ', label: 'AED - UAE Dirham' },
];

const COUNTRIES = [
  { name: 'Nepal', flag: '🇳🇵', currency: 'NPR' },
  { name: 'India', flag: '🇮🇳', currency: 'INR' },
  { name: 'United States', flag: '🇺🇸', currency: 'USD' },
  { name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP' },
  { name: 'United Arab Emirates', flag: '🇦🇪', currency: 'AED' },
  { name: 'Australia', flag: '🇦🇺', currency: 'AUD' },
  { name: 'Canada', flag: '🇨🇦', currency: 'CAD' },
  { name: 'Other Country', flag: '🌐', currency: 'USD' },
];

export const ProfileSetupView: React.FC<ProfileSetupViewProps> = ({
  user,
  initialProfile,
  initialPending,
  isPreAuthOnboarding = false,
  isInitialSetup = true,
  onContinueToAuth,
  onProfileSaved,
  onGoToLogin,
  onCancel,
}) => {
  const { language: appLang, setLanguage: setAppLanguage, t } = useLanguage();

  // Pre-fill from pending draft or initial profile
  const existingDraft = initialPending || authService.getPendingOnboardingProfile();

  // Form Fields
  const [fullName, setFullName] = useState<string>(
    existingDraft?.fullName || initialProfile?.full_name || user?.displayName || ''
  );
  const [businessName, setBusinessName] = useState<string>(
    existingDraft?.businessName || initialProfile?.business_name || ''
  );
  const [country, setCountry] = useState<string>(
    existingDraft?.country || initialProfile?.country || 'Nepal'
  );
  const [address, setAddress] = useState<string>(
    existingDraft?.address || initialProfile?.address || ''
  );
  const [phone, setPhone] = useState<string>(
    existingDraft?.phone || initialProfile?.phone || user?.phone || ''
  );
  const [email, setEmail] = useState<string>(
    initialProfile?.email || user?.email || ''
  );
  const [language, setLanguage] = useState<SupportedLanguage>(() => {
    const rawLang = existingDraft?.language || initialProfile?.language;
    if (rawLang) {
      const clean = rawLang.toLowerCase();
      if (clean.includes('nepal') || clean === 'ne') return 'ne';
      if (clean.includes('hindi') || clean === 'hi') return 'hi';
      return 'en';
    }
    return appLang;
  });
  const [currency, setCurrency] = useState<string>(
    existingDraft?.currency || initialProfile?.currency || 'NPR'
  );

  // Photo State
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialProfile?.profile_image_url || user?.photoURL || null
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Camera Live Modal State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Status & Validation
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-sync currency when user chooses country (if user hasn't explicitly customized yet)
  const handleCountryChange = (newCountryName: string) => {
    setCountry(newCountryName);
    const matched = COUNTRIES.find((c) => c.name === newCountryName);
    if (matched && matched.currency) {
      setCurrency(matched.currency);
    }
  };

  // Compress & crop an image to a square JPEG before uploading
  const compressAndSquareImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = Math.min(img.width, img.height);
          const targetSize = Math.min(size, 600); // 600x600 square max

          canvas.width = targetSize;
          canvas.height = targetSize;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(img.src);
            return;
          }

          const startX = (img.width - size) / 2;
          const startY = (img.height - size) / 2;

          ctx.drawImage(img, startX, startY, size, size, 0, 0, targetSize, targetSize);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          resolve(compressed);
        };
        img.onerror = () => reject(new Error('Failed to parse image.'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  };

  // Handle File Input Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, or WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('Image file is too large (maximum 8MB).');
      return;
    }

    setErrorMessage(null);
    setIsUploadingPhoto(true);
    setUploadProgress(20);

    try {
      const compressedDataUrl = await compressAndSquareImage(file);
      setAvatarPreview(compressedDataUrl);
      setUploadProgress(60);

      // Only attempt authenticated storage upload if user is already authenticated
      if (user?.id) {
        const uploadRes = await authService.uploadAvatar(compressedDataUrl, 'image/jpeg');
        setUploadProgress(100);
        if (uploadRes.success && uploadRes.avatarUrl) {
          setAvatarPreview(uploadRes.avatarUrl);
        }
      } else {
        setUploadProgress(100);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing profile photo.');
    } finally {
      setIsUploadingPhoto(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Start Camera Capture for profile photo
  const handleStartCamera = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      mediaStreamRef.current = stream;
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (e: any) {
      setErrorMessage('Camera access was denied or is unavailable on this device.');
    }
  };

  const handleStopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleCaptureCamera = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const size = Math.min(video.videoWidth, video.videoHeight);
    const targetSize = Math.min(size, 600);

    canvas.width = targetSize;
    canvas.height = targetSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;

    ctx.drawImage(video, startX, startY, size, size, 0, 0, targetSize, targetSize);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    handleStopCamera();
    setAvatarPreview(dataUrl);

    if (user?.id) {
      setIsUploadingPhoto(true);
      try {
        const uploadRes = await authService.uploadAvatar(dataUrl, 'image/jpeg');
        if (uploadRes.success && uploadRes.avatarUrl) {
          setAvatarPreview(uploadRes.avatarUrl);
        }
      } catch {
        // Direct dataUrl fallback
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };

  const handleRemovePhoto = () => {
    setAvatarPreview(null);
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = fullName.trim();
    const cleanBusiness = businessName.trim();
    const cleanAddress = address.trim();

    if (cleanName.length < 2) {
      setErrorMessage('Please enter your full name (minimum 2 characters).');
      return;
    }

    if (cleanBusiness.length < 2) {
      setErrorMessage('Please enter your business or shop name (minimum 2 characters).');
      return;
    }

    if (cleanAddress.length < 2) {
      setErrorMessage('Please enter your store address or city.');
      return;
    }

    // SCENARIO 1: PRE-AUTH ONBOARDING (New User before Email Verification)
    if (isPreAuthOnboarding) {
      const pendingData: PendingOnboardingProfile = {
        fullName: cleanName,
        businessName: cleanBusiness,
        country,
        address: cleanAddress,
        language,
        currency,
        phone: phone.trim(),
        completedAt: Date.now(),
      };

      authService.setPendingOnboardingProfile(pendingData);
      setSuccessMessage('Profile saved! Proceeding to email verification…');

      setTimeout(() => {
        if (onContinueToAuth) {
          onContinueToAuth(pendingData);
        }
      }, 250);
      return;
    }

    // SCENARIO 2: POST-AUTH PROFILE COMPLETION (Authenticated User saving profile to database)
    setIsSaving(true);
    try {
      const cleanUsername = (
        cleanBusiness.toLowerCase().replace(/[^a-z0-9_]/g, '') ||
        `user_${Date.now().toString(36)}`
      );

      const res = await authService.saveProfile({
        full_name: cleanName,
        business_name: cleanBusiness,
        country,
        username: cleanUsername,
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        address: cleanAddress,
        language,
        currency,
        profile_image_url: avatarPreview || '',
        onboarding_completed: true,
      });

      if (res.success && res.profile) {
        setSuccessMessage('Profile saved successfully! Entering store…');
        setTimeout(() => {
          onProfileSaved?.(res.profile!);
        }, 350);
      } else {
        setErrorMessage(res.error || 'Failed to save profile. Please check connection and try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-6 sm:py-10 px-4 sm:px-6 flex flex-col justify-center">
      <div className="max-w-xl w-full mx-auto">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/90 space-y-6">
          {/* 1. Step Indicator for New Users */}
          {isPreAuthOnboarding && (
            <div className="flex items-center justify-between gap-2 px-1 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-black text-indigo-600">
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">
                  1
                </div>
                <span>1. Store Profile</span>
              </div>
              <div className="h-0.5 flex-1 bg-slate-200 mx-1 rounded-full" />
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                  2
                </div>
                <span>2. Verify Email</span>
              </div>
              <div className="h-0.5 flex-1 bg-slate-200 mx-1 rounded-full" />
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                  3
                </div>
                <span>3. Ready</span>
              </div>
            </div>
          )}

          {/* 2. Header */}
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60 inline-flex items-center gap-1">
                <Store className="w-3 h-3 text-indigo-600" />
                {isPreAuthOnboarding
                  ? 'Step 1 of 3: New User Registration'
                  : isInitialSetup
                  ? 'Complete Required Profile'
                  : 'Store Profile Settings'}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5 tracking-tight">
                {isPreAuthOnboarding
                  ? 'Create Your Store Profile'
                  : 'Complete Your Business Profile'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {isPreAuthOnboarding
                  ? 'Enter your shop details first. You will verify your email in the next step.'
                  : 'Please complete your business details to access the AI scanner and inventory.'}
              </p>
            </div>

            {!isInitialSetup && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* 3. Feedback Banners */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {/* 4. Optional Photo Upload */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-2.5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-md bg-slate-200 flex items-center justify-center">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Profile Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-slate-400" />
                )}
              </div>

              {isUploadingPhoto && (
                <div className="absolute inset-0 rounded-full bg-black/60 flex flex-col items-center justify-center text-white">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-[9px] font-bold mt-1">{uploadProgress}%</span>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>Upload Logo / Photo</span>
              </button>

              <button
                type="button"
                onClick={handleStartCamera}
                disabled={isUploadingPhoto}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-600" />
                <span>Take Photo</span>
              </button>

              {avatarPreview && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={isUploadingPhoto}
                  className="px-2.5 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              Optional store logo or shopkeeper photo (stored securely).
            </p>
          </div>

          {/* 5. Profile Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name (Required) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ram Bahadur Shrestha"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Business / Shop Name (Required) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Business / Shop Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Himalayan Grocery Store"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>
            </div>

            {/* Country & Address Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Country (Auto-detected default, editable) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Country <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={country}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mobile Phone (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Mobile Number <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+977 98XXXXXXXX"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>
            </div>

            {/* Store Location / Address (Required) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Store Location / Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <textarea
                  rows={2}
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. New Road, Ward 22, Kathmandu"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
                />
              </div>
            </div>

            {/* Language & Currency Preferences */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  {t('profile.language')}
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={language}
                    onChange={(e) => {
                      const newCode = e.target.value as SupportedLanguage;
                      setLanguage(newCode);
                      setAppLanguage(newCode);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  {t('profile.currency')}
                </label>
                <div className="relative">
                  <Coins className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* If user is already authenticated and completing profile, show email readonly */}
            {!isPreAuthOnboarding && email && (
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Authenticated Email Account
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={isSaving}
                id="btn-save-profile"
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Profile Details…</span>
                  </>
                ) : isPreAuthOnboarding ? (
                  <>
                    <span>Continue to Email Verification</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Complete Profile &amp; Enter Main App</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Already have an account? Login */}
              {isPreAuthOnboarding && onGoToLogin && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={onGoToLogin}
                    className="text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Already have an account? <strong>Log In</strong></span>
                  </button>
                </div>
              )}
            </div>
          </form>

          {/* Privacy & Security Note */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span>Store profile data is private and secured by Supabase Row Level Security.</span>
          </div>
        </div>
      </div>

      {/* Live Camera Modal */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 rounded-3xl p-5 max-w-sm w-full border border-slate-700 text-white space-y-4 text-center">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Take Store Photo</span>
              <button
                type="button"
                onClick={handleStopCamera}
                className="p-1 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-square rounded-2xl overflow-hidden bg-black border-2 border-slate-700">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-52 h-52 rounded-full border-2 border-indigo-500 border-dashed shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleStopCamera}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCaptureCamera}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
              >
                <Camera className="w-4 h-4" />
                <span>Capture</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSetupView;
