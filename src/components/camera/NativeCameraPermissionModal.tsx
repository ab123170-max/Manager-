/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Camera, ShieldAlert, Settings, RotateCcw, X, Loader2 } from 'lucide-react';
import {
  getCameraPermissionStatus,
  requestCameraPermission,
  openCameraAppSettings,
} from '../../plugins/scanmeCamera';

export type PermissionModalState = 'denied' | 'permanently_denied';

interface NativeCameraPermissionModalProps {
  isOpen: boolean;
  initialState?: PermissionModalState;
  onPermissionGranted: () => void;
  onClose: () => void;
}

export const NativeCameraPermissionModal: React.FC<NativeCameraPermissionModalProps> = ({
  isOpen,
  initialState = 'denied',
  onPermissionGranted,
  onClose,
}) => {
  const [modalState, setModalState] = useState<PermissionModalState>(initialState);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    setModalState(initialState);
  }, [initialState, isOpen]);

  // Check real Android permission when app regains focus or visibility (e.g. returning from Android Settings)
  const verifyPermissionState = useCallback(async () => {
    if (!isOpen) return;
    try {
      const status = await getCameraPermissionStatus();
      console.log('[NativeCameraPermissionModal] verifyPermissionState on focus/resume:', status);
      if (status === 'granted') {
        onPermissionGranted();
      }
    } catch (err) {
      console.warn('[NativeCameraPermissionModal] permission check on resume error:', err);
    }
  }, [isOpen, onPermissionGranted]);

  useEffect(() => {
    if (!isOpen) return;

    const handleFocus = () => {
      verifyPermissionState();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [isOpen, verifyPermissionState]);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const status = await requestCameraPermission();
      console.log('[NativeCameraPermissionModal] request result:', status);
      if (status === 'granted') {
        onPermissionGranted();
      } else if (status === 'prompt-with-rationale') {
        setModalState('denied');
      } else {
        setModalState('permanently_denied');
      }
    } catch (err) {
      console.warn('[NativeCameraPermissionModal] request error:', err);
      setModalState('denied');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleOpenSettings = async () => {
    await openCameraAppSettings();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-4">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        {/* State 1: Denied (Temporarily) */}
        {modalState === 'denied' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-sm">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900">
                Camera Permission Needed
              </h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Camera permission is required to scan products and barcodes directly inside the app.
              </p>
            </div>
            <div className="w-full pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleRequestPermission}
                disabled={isRequesting}
                className="w-full py-3.5 px-4 rounded-xl bg-[#1473EA] hover:bg-blue-600 text-white text-sm font-bold shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isRequesting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Requesting...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Allow Camera Access</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleOpenSettings}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span>Open Settings</span>
              </button>
            </div>
          </>
        )}

        {/* State 2: Permanently Denied */}
        {modalState === 'permanently_denied' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-sm">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900">
                Camera Access Disabled
              </h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Camera permission is disabled. Please enable Camera permission in Android Settings to use ScanMe AI.
              </p>
            </div>
            <div className="w-full pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleOpenSettings}
                className="w-full py-3.5 px-4 rounded-xl bg-[#1473EA] hover:bg-blue-600 text-white text-sm font-bold shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>Open Android Settings</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
