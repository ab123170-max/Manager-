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
  AtSign,
  Phone,
  Mail,
  MapPin,
  Globe,
  Coins,
  ArrowRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { UserProfile, AuthUser } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { SupportedLanguage } from '../../translations';

interface ProfileSetupViewProps {
  user: AuthUser;
  initialProfile?: UserProfile | null;
  isInitialSetup?: boolean;
  onProfileSaved: (profile: UserProfile) => void;
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

export const ProfileSetupView: React.FC<ProfileSetupViewProps> = ({
  user,
  initialProfile,
  isInitialSetup = true,
  onProfileSaved,
  onCancel,
}) => {
  const { language: appLang, setLanguage: setAppLanguage, t } = useLanguage();

  // Form Fields
  const [fullName, setFullName] = useState<string>(
    initialProfile?.full_name || user.displayName || ''
  );
  const [username, setUsername] = useState<string>(() => {
    if (initialProfile?.username) return initialProfile.username;
    if (user.email) return user.email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
    if (user.phone) return `user_${user.phone.slice(-4)}`;
    return `user_${Math.random().toString(36).substring(2, 7)}`;
  });
  const [phone, setPhone] = useState<string>(initialProfile?.phone || user.phone || '');
  const [email, setEmail] = useState<string>(initialProfile?.email || user.email || '');
  const [address, setAddress] = useState<string>(initialProfile?.address || '');
  const [language, setLanguage] = useState<SupportedLanguage>(() => {
    if (initialProfile?.language) {
      const clean = initialProfile.language.toLowerCase();
      if (clean.includes('nepal') || clean === 'ne') return 'ne';
      if (clean.includes('hindi') || clean === 'hi') return 'hi';
      return 'en';
    }
    return appLang;
  });
  const [currency, setCurrency] = useState<string>(initialProfile?.currency || 'NPR');

  // Photo State
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialProfile?.profile_image_url || user.photoURL || null
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

          // Center crop calculation
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

      // Upload to server storage endpoint
      const uploadRes = await authService.uploadAvatar(compressedDataUrl, 'image/jpeg');
      setUploadProgress(100);

      if (uploadRes.success && uploadRes.avatarUrl) {
        setAvatarPreview(uploadRes.avatarUrl);
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
  };

  const handleRemovePhoto = () => {
    setAvatarPreview(null);
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = fullName.trim();
    const cleanUsername = username.trim().replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();

    if (cleanName.length < 2) {
      setErrorMessage('Please enter your full name (minimum 2 characters).');
      return;
    }

    if (cleanUsername.length < 3) {
      setErrorMessage('Please enter a username of at least 3 alphanumeric characters.');
      return;
    }

    setIsSaving(true);

    try {
      const res = await authService.saveProfile({
        full_name: cleanName,
        username: cleanUsername,
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        address: address.trim(),
        language,
        currency,
        profile_image_url: avatarPreview || '',
      });

      if (res.success && res.profile) {
        setSuccessMessage('Profile saved successfully.');
        setTimeout(() => {
          onProfileSaved(res.profile!);
        }, 350);
      } else {
        setErrorMessage(res.error || 'Failed to save profile. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-8 px-4 sm:px-6 flex flex-col justify-center">
      <div className="max-w-xl w-full mx-auto">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1473EA] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                {isInitialSetup ? 'Onboarding Step' : 'User Settings'}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#092B4C] mt-1 tracking-tight">
                {isInitialSetup ? 'Create Your Profile' : 'Edit Your Profile'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Set up your store identity, contact info, and localized currency settings.
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

          {/* Feedback Banners */}
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

          {/* Profile Photo Area */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-3">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-white shadow-md bg-slate-200 flex items-center justify-center">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Profile Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-slate-400" />
                )}
              </div>

              {isUploadingPhoto && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center text-white">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-[9px] font-bold mt-1">{uploadProgress}%</span>
                </div>
              )}
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Photo Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                id="btn-upload-photo"
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5 text-[#1473EA]" />
                <span>Upload Photo</span>
              </button>

              <button
                type="button"
                onClick={handleStartCamera}
                disabled={isUploadingPhoto}
                id="btn-take-photo"
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-600" />
                <span>Take Photo</span>
              </button>

              {avatarPreview && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={isUploadingPhoto}
                  id="btn-remove-photo"
                  className="px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              Square avatar automatically compressed and stored securely.
            </p>
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-[#092B4C] mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Sharma"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1473EA]"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-[#092B4C] mb-1.5">
                  Username <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <AtSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    placeholder="e.g. smart_retail"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1473EA]"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-[#092B4C] mb-1.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+977 98XXXXXXXX"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1473EA]"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-[#092B4C] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="store@domain.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1473EA]"
                  />
                </div>
              </div>
            </div>

            {/* Store Address / Location */}
            <div>
              <label className="block text-xs font-bold text-[#092B4C] mb-1.5">
                Store Location / Address
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. New Road, Kathmandu, Nepal"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1473EA] resize-none"
                />
              </div>
            </div>

            {/* Language & Currency Preferences */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-[#092B4C] mb-1.5">
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1473EA]"
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
                <label className="block text-xs font-bold text-[#092B4C] mb-1.5">
                  {t('profile.currency')}
                </label>
                <div className="relative">
                  <Coins className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1473EA]"
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

            {/* Submit Action */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isSaving}
                id="btn-save-profile"
                className="w-full py-3.5 rounded-2xl bg-[#1473EA] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-[#1473EA]/25 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving profile…</span>
                  </>
                ) : (
                  <>
                    <span>{isInitialSetup ? 'Complete Setup & Open Dashboard' : 'Save Changes'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security Note */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>Profile record tied securely to auth ID: {user.auth_user_id.slice(0, 12)}…</span>
          </div>
        </div>
      </div>

      {/* Live Camera Modal */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 rounded-3xl p-5 max-w-sm w-full border border-slate-700 text-white space-y-4 text-center">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Take Profile Photo</span>
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
              {/* Circular framing overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-52 h-52 rounded-full border-2 border-[#1473EA] border-dashed shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
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
                className="px-6 py-2.5 rounded-xl bg-[#1473EA] text-xs font-bold text-white hover:bg-blue-600 flex items-center gap-1.5 shadow-md shadow-[#1473EA]/30"
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
