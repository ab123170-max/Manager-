import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  requestCameraStream, stopCameraStream, cameraErrorMessage,
  startNativeCamera, stopNativeCamera, captureNativeSample,
  setNativeTorch, flipNativeCamera, CameraFacingMode
} from '../services/cameraEngine';

export function useLiveCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState({
    isStreaming: false, hasPermission: null as boolean | null,
    error: null as string | null, facingMode: 'environment' as CameraFacingMode,
    availableDevices: [] as MediaDeviceInfo[],
  });
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isTorchAvailable, setIsTorchAvailable] = useState(false);

  const stopCamera = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      await stopNativeCamera();
    } else {
      stopCameraStream(streamRef.current);
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
    setCameraState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  const startCamera = useCallback(async (mode?: CameraFacingMode) => {
    const target = mode || cameraState.facingMode;
    await stopCamera();
    setCameraState(prev => ({ ...prev, error: null, facingMode: target }));
    try {
      if (Capacitor.isNativePlatform()) {
        const parent = previewRef.current;
        if (!parent) throw new Error('Camera preview container is not ready.');
        parent.id = 'scanme-native-camera';
        await startNativeCamera('scanme-native-camera', target);
        setIsTorchAvailable(true);
        setCameraState(prev => ({ ...prev, isStreaming: true, hasPermission: true, facingMode: target }));
        return;
      }
      const stream = await requestCameraStream({ facingMode: target });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error('Camera preview is not ready.');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      setIsTorchAvailable(Boolean(stream.getVideoTracks()[0]?.getCapabilities?.().torch));
      setCameraState(prev => ({ ...prev, isStreaming: true, hasPermission: true, error: null, facingMode: target }));
    } catch (error) {
      await stopCamera();
      setCameraState(prev => ({ ...prev, isStreaming: false, hasPermission: false, error: cameraErrorMessage(error) }));
    }
  }, [cameraState.facingMode, stopCamera]);

  const toggleFacingMode = useCallback(() => {
    const next = cameraState.facingMode === 'environment' ? 'user' : 'environment';
    if (Capacitor.isNativePlatform()) {
      void flipNativeCamera().then(() => setCameraState(p => ({ ...p, facingMode: next }))).catch(() => void startCamera(next));
    } else {
      void startCamera(next);
    }
  }, [cameraState.facingMode, startCamera]);

  const toggleTorch = useCallback(async () => {
    try {
      const next = !isTorchOn;
      if (Capacitor.isNativePlatform()) await setNativeTorch(next);
      else {
        const track = streamRef.current?.getVideoTracks()[0];
        if (track) await track.applyConstraints({ advanced: [{ torch: next } as any] } as any);
      }
      setIsTorchOn(next);
    } catch {}
  }, [isTorchOn]);

  const captureFrame = useCallback(async () => {
    if (Capacitor.isNativePlatform()) return captureNativeSample();
    const video = videoRef.current;
    if (!video || !video.videoWidth) return '';
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  }, []);

  useEffect(() => () => { void stopCamera(); }, [stopCamera]);

  return { videoRef, previewRef, streamRef, cameraState, startCamera, stopCamera, toggleFacingMode, isTorchOn, isTorchAvailable, toggleTorch, captureFrame };
}
