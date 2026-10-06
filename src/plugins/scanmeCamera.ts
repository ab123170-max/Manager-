import { registerPlugin } from '@capacitor/core';
export interface ScanMeCameraPlugin {
 requestCameraPermission(): Promise<{camera:string}>;
 getPermissionStatus(): Promise<{camera:string}>;
 openCamera(options?:{facingMode?:'environment'|'user'}):Promise<{success:boolean;facingMode?:string}>;
 capturePhoto():Promise<{success:boolean;dataUrl:string}>;
 switchCamera():Promise<{success:boolean}>;
 setFlashMode(options:{flashMode:'auto'|'on'|'off'|'torch'}):Promise<{success:boolean}>;
 closeCamera():Promise<{success:boolean}>;
}
export const ScanMeCamera=registerPlugin<ScanMeCameraPlugin>('ScanMeCamera');