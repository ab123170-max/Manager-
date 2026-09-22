/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface LanguageSelectorButtonProps {
  variant?: 'compact' | 'full' | 'outline' | 'ghost' | 'pill';
  className?: string;
  showLabel?: boolean;
}

export const LanguageSelectorButton: React.FC<LanguageSelectorButtonProps> = ({
  variant = 'compact',
  className = '',
  showLabel = true,
}) => {
  const { languageOption, openLanguageSelector } = useLanguage();

  const getVariantStyles = () => {
    switch (variant) {
      case 'pill':
        return 'bg-white/90 hover:bg-white text-slate-800 border border-slate-200/80 shadow-xs px-3 py-1.5 rounded-full';
      case 'outline':
        return 'bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl';
      case 'ghost':
        return 'bg-transparent hover:bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-xl';
      case 'full':
        return 'w-full bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 p-3 rounded-2xl justify-between';
      case 'compact':
      default:
        return 'bg-slate-100 hover:bg-slate-200/80 text-slate-800 px-2.5 py-1.5 rounded-xl text-xs font-bold';
    }
  };

  return (
    <button
      type="button"
      onClick={openLanguageSelector}
      className={`inline-flex items-center gap-1.5 transition-all text-xs font-bold active:scale-95 cursor-pointer select-none ${getVariantStyles()} ${className}`}
      title="Change Language"
      aria-label="Change Language"
    >
      <span className="text-sm select-none leading-none" role="img" aria-label={languageOption.name}>
        {languageOption.flag}
      </span>
      {showLabel && (
        <span className="truncate">{languageOption.name}</span>
      )}
      <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
    </button>
  );
};
