/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  User,
  LogOut,
  Globe,
  Bell,
  Lock,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  HelpCircle,
  Building2,
  Mail,
  Phone,
  Edit2,
  Check,
} from 'lucide-react';
import { UserProfile, AuthUser } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { SupportedLanguage } from '../../translations';
import { LogoutConfirmModal } from './LogoutConfirmModal';

interface MoreProfilePageProps {
  user?: AuthUser | null;
  userProfile?: UserProfile | null;
  onEditProfile: () => void;
  onOpenSettings: () => void;
  onOpenGoogleSheets: () => void;
  onNavigateToResetPassword: () => void;
  onLogout: () => Promise<void>;
}

const LANGUAGES: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'ne', label: 'नेपाली (Nepali)', flag: '🇳🇵' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिन्दी (Hindi)', flag: '🇮🇳' },
];

export const MoreProfilePage: React.FC<MoreProfilePageProps> = ({
  user,
  userProfile,
  onEditProfile,
  onOpenSettings,
  onOpenGoogleSheets,
  onNavigateToResetPassword,
  onLogout,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const fullName = userProfile?.full_name || user?.displayName || 'User';
  const email = userProfile?.email || user?.email || 'N/A';
  const businessName = userProfile?.business_name || '';
  const country = userProfile?.country || 'Nepal';
  const phone = userProfile?.phone || '';

  return (
    <div className="space-y-4 font-sans text-slate-900 pb-2">
      {/* 1. Profile Header Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#092B4C] to-[#1473EA] text-white flex items-center justify-center font-black text-xl shadow-md shrink-0 overflow-hidden border-2 border-white">
              {userProfile?.profile_image_url ? (
                <img
                  src={userProfile.profile_image_url}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                fullName.charAt(0).toUpperCase() || <User className="w-7 h-7" />
              )}
            </div>

            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black text-slate-900 truncate">
                {fullName}
              </h1>
              <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{email}</span>
              </p>
              {businessName && (
                <p className="text-xs text-slate-600 font-semibold truncate flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3 h-3 text-[#1473EA] shrink-0" />
                  <span className="truncate">{businessName}</span>
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onEditProfile}
            className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1473EA] text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
            title="Edit Profile"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Edit Profile</span>
          </button>
        </div>
      </div>

      {/* 2. Preferences & Language */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 px-0.5">
          App Preferences &amp; Language
        </h2>

        {/* Language Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-[#1473EA]" />
            <span>Application Language</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {LANGUAGES.map((lang) => {
              const isSelected = language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLanguage(lang.code)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-[#1473EA] text-white border-[#1473EA] shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span>{lang.flag}</span>
                    <span className="truncate">{lang.label.split(' ')[0]}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Expiry Alert Notifications Toggle */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Expiry Alert Notifications</div>
              <div className="text-[11px] text-slate-500">Proactive alerts for expiring products</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setNotificationsEnabled((prev) => !prev)}
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
              notificationsEnabled ? 'bg-[#1473EA]' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-xs absolute top-0.5 transition-transform ${
                notificationsEnabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 3. Account Security & Password Reset */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-2">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 px-0.5">
          Account &amp; Security
        </h2>

        <button
          type="button"
          onClick={onNavigateToResetPassword}
          className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors flex items-center justify-between text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-900 group-hover:text-[#1473EA]">
                Reset Password
              </div>
              <div className="text-[11px] text-slate-500">Update or change account password</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#1473EA]" />
        </button>

        <button
          type="button"
          onClick={onOpenGoogleSheets}
          className="w-full p-3 rounded-xl bg-emerald-50/60 hover:bg-emerald-100/60 border border-emerald-200/80 transition-colors flex items-center justify-between text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-emerald-950">
                Google Sheets Sync &amp; Backup
              </div>
              <div className="text-[11px] text-emerald-700">Export inventory to Google Sheets</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-emerald-600" />
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors flex items-center justify-between text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-900 group-hover:text-[#1473EA]">
                App Settings
              </div>
              <div className="text-[11px] text-slate-500">Currency, scanner defaults &amp; info</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#1473EA]" />
        </button>
      </div>

      {/* 4. Logout Action Button */}
      <div className="bg-white rounded-2xl p-4 border border-rose-200/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-extrabold text-rose-900 uppercase tracking-wider">
              Sign Out
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Securely end active session on this device
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsLogoutModalOpen(true)}
          className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
          id="btn-logout-trigger"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirmLogout={onLogout}
      />
    </div>
  );
};

export default MoreProfilePage;
