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
 * - Provides clear error diagnostics (e.g. NotAllowedError, NotFoundError)
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
        track.stop();
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

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraState((prev) => ({
          ...prev,
          hasPermission: false,
          error:
            'Camera API is not supported in this browser or context. Please use file upload instead or ensure HTTPS is active.',
        }));
        return;
      }

      try {
        setCameraState((prev) => ({ ...prev, error: null }));

        // Request high-resolution video stream for readable document text
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: targetFacingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false, // We only need video frames, not audio
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
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
          // Play automatically once metadata is loaded
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
                console.error('Video play error:', playErr);
              });
          };
        }

        // Query available video devices for device switching
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(
          (device) => device.kind === 'videoinput'
        );

        setCameraState((prev) => ({
          ...prev,
          availableDevices: videoInputs,
          facingMode: targetFacingMode,
          hasPermission: true,
        }));
      } catch (err: unknown) {
        const error = err as Error;
        console.error('Camera initialization failed:', error);
        let message = 'Unable to access camera.';

        if (
          error.name === 'NotAllowedError' ||
          error.name === 'PermissionDeniedError'
        ) {
          message =
            'Camera permission was denied. Please allow camera access in your browser site settings or use file upload.';
        } else if (
          error.name === 'NotFoundError' ||
          error.name === 'DevicesNotFoundError'
        ) {
          message =
            'No camera device detected. Please connect a webcam or use file upload.';
        } else if (
          error.name === 'NotReadableError' ||
          error.name === 'TrackStartError'
        ) {
          message =
            'Camera is already in use by another application or browser tab.';
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
