/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { CameraState } from '../types';

/**
 * ============================================================================
 * CUSTOM HOOK: useCamera
 * ============================================================================
 * Manages the HTML5 MediaDevices API lifecycle:
 * - Requests camera permissions via `navigator.mediaDevices.getUserMedia`
 * - Attaches the MediaStream to a video element (`videoRef.current.srcObject = stream`)
 * - Switches between front and rear cameras (facingMode: 'user' | 'environment')
 * - Gracefully releases video hardware tracks when unmounting or switching
 * - Provides clear error diagnostics and fallback states (NotAllowedError, NotFoundError)
 */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isTorchAvailable, setIsTorchAvailable] = useState(false);

  const [cameraState, setCameraState] = useState<CameraState>({
    isStreaming: false,
    hasPermission: null,
    error: null,
    facingMode: 'environment', // default to back camera for document scanning
    availableDevices: [],
  });

  /**
   * Stops all active media tracks to free the camera hardware and turn off the indicator light.
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
    setIsTorchAvailable(false);
    setCameraState((prev) => ({
      ...prev,
      isStreaming: false,
    }));
  }, []);

  /**
   * Toggles the device flashlight / torch if supported by the active video track.
   */
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextState = !isTorchOn;
      // Use standard MediaStreamTrack applyConstraints with advanced torch option
      await (track as unknown as { applyConstraints: (constraints: unknown) => Promise<void> }).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setIsTorchOn(nextState);
    } catch (err) {
      console.warn('Torch toggle failed or not supported:', err);
    }
  }, [isTorchOn]);

  /**
   * Starts the camera stream using navigator.mediaDevices.getUserMedia.
   * Includes error handling for permissions, hardware availability, and HTTPS constraints.
   */
  const startCamera = useCallback(
    async (mode?: 'user' | 'environment') => {
      // Clean up any existing stream before starting a new one
      stopCamera();

      const targetFacingMode = mode || cameraState.facingMode;

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraState((prev) => ({
          ...prev,
          hasPermission: false,
          error:
            'Camera API is not supported in this browser or context. Please use photo upload instead.',
        }));
        return;
      }

      try {
        setCameraState((prev) => ({ ...prev, error: null }));

        // Request video stream with fallback constraint handling
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: targetFacingMode },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          });
        } catch (initialErr: any) {
          // Fallback to basic video constraints if high-res failed
          if (initialErr?.name === 'OverconstrainedError' || initialErr?.name === 'ConstraintNotSatisfiedError') {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } else {
            throw initialErr;
          }
        }

        streamRef.current = stream;

        // Check torch capabilities on the active video track
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          try {
            const capabilities = (videoTrack as unknown as { getCapabilities?: () => { torch?: boolean } }).getCapabilities?.();
            if (capabilities && 'torch' in capabilities) {
              setIsTorchAvailable(Boolean(capabilities.torch));
            }
          } catch {
            setIsTorchAvailable(false);
          }
        }

        // Bind the stream directly to the video element's srcObject
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current
              ?.play()
              .then(() => {
                setCameraState((prev) => ({
                  ...prev,
                  isStreaming: true,
                  hasPermission: true,
                  facingMode: targetFacingMode,
                  error: null,
                }));
              })
              .catch((playErr) => {
                console.warn('Video element play was deferred:', playErr);
              });
          };
        }

        // Query available video devices
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((device) => device.kind === 'videoinput');
          setCameraState((prev) => ({
            ...prev,
            availableDevices: videoInputs,
            facingMode: targetFacingMode,
            hasPermission: true,
          }));
        } catch {
          // Ignore enumeration failure
        }
      } catch (err: unknown) {
        const error = err as Error;
        console.warn('Camera access denied or unavailable:', error.message || error.name);
        let message = 'Unable to access camera.';

        const errName = error.name || '';
        const errMsg = (error.message || '').toLowerCase();

        if (
          errName === 'NotAllowedError' ||
          errName === 'PermissionDeniedError' ||
          errMsg.includes('permission') ||
          errMsg.includes('denied')
        ) {
          message =
            'Camera permission was denied. Please allow camera access in your browser or site settings, or use photo upload / manual entry.';
        } else if (
          errName === 'NotFoundError' ||
          errName === 'DevicesNotFoundError' ||
          errMsg.includes('not found')
        ) {
          message =
            'No camera device detected. Please connect a webcam or use photo upload.';
        } else if (
          errName === 'NotReadableError' ||
          errName === 'TrackStartError' ||
          errMsg.includes('in use')
        ) {
          message =
            'Camera is in use by another tab or app. Please close other camera apps or use file upload.';
        } else {
          message = error.message || 'Camera initialization failed.';
        }

        setCameraState((prev) => ({
          ...prev,
          isStreaming: false,
          hasPermission: false,
          error: message,
        }));
      }
    },
    [cameraState.facingMode, stopCamera]
  );

  /**
   * Toggles between front and rear cameras (useful on mobile devices).
   */
  const toggleFacingMode = useCallback(() => {
    const nextMode =
      cameraState.facingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextMode);
  }, [cameraState.facingMode, startCamera]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    streamRef,
    cameraState,
    startCamera,
    stopCamera,
    toggleFacingMode,
    isTorchOn,
    isTorchAvailable,
    toggleTorch,
  };
}
