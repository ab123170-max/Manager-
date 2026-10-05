import { useCallback, useEffect, useRef, useState } from 'react';
import { requestCameraStream, stopCameraStream, cameraErrorMessage, CameraFacingMode } from '../services/cameraEngine';

export function useLiveCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState({
    isStreaming: false,
    hasPermission: null as boolean | null,
    error: null as string | null,
    facingMode: 'environment' as CameraFacingMode,
    availableDevices: [] as MediaDeviceInfo[],
  });
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isTorchAvailable, setIsTorchAvailable] = useState(false);

  const stopCamera = useCallback(() => {
    stopCameraStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsTorchOn(false);
    setIsTorchAvailable(false);
    setCameraState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  const startCamera = useCallback(async (mode?: CameraFacingMode) => {
    const target = mode || cameraState.facingMode;
    stopCamera();
    setCameraState(prev => ({ ...prev, error: null }));

    try {
      const stream = await requestCameraStream({ facingMode: target });
      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      if (track) {
        try {
          const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
          setIsTorchAvailable(Boolean(capabilities?.torch));
        } catch {}
      }

      const video = videoRef.current;
      if (!video) {
        stopCameraStream(stream);
        streamRef.current = null;
        throw new Error('Camera preview is not ready. Please try again.');
      }

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      let devices: MediaDeviceInfo[] = [];
      try {
        devices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
      } catch {}

      setCameraState({
        isStreaming: true,
        hasPermission: true,
        error: null,
        facingMode: target,
        availableDevices: devices,
      });
    } catch (error) {
      stopCamera();
      setCameraState(prev => ({
        ...prev,
        isStreaming: false,
        hasPermission: false,
        error: cameraErrorMessage(error),
      }));
    }
  }, [cameraState.facingMode, stopCamera]);

  const toggleFacingMode = useCallback(() => {
    const next = cameraState.facingMode === 'environment' ? 'user' : 'environment';
    void startCamera(next);
  }, [cameraState.facingMode, startCamera]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      const next = !isTorchOn;
      await track.applyConstraints({ advanced: [{ torch: next } as any] } as any);
      setIsTorchOn(next);
    } catch {}
  }, [isTorchOn]);

  useEffect(() => () => stopCamera(), [stopCamera]);

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
