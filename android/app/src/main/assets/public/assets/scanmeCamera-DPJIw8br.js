import{c as t,b as n,m as o}from"./index-DZPG5QJ8.js";/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i=[["path",{d:"M10.513 4.856 13.12 2.17a.5.5 0 0 1 .86.46l-1.377 4.317",key:"193nxd"}],["path",{d:"M15.656 10H20a1 1 0 0 1 .78 1.63l-1.72 1.773",key:"27a7lr"}],["path",{d:"M16.273 16.273 10.88 21.83a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14H4a1 1 0 0 1-.78-1.63l4.507-4.643",key:"1e0qe9"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]],m=t("zap-off",i);/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */const s=o("ScanMeCamera"),e=s;function r(){return n.isNativePlatform()&&n.getPlatform()==="android"}async function u(){if(!r())return!1;try{return(await e.requestCameraPermission()).camera==="granted"}catch(a){return console.warn("[ScanMeCamera] requestCameraPermission failed:",a),!1}}async function l(a={facingMode:"environment",toBack:!0}){if(!r())throw new Error("ScanMeCamera is only available on Android native APK.");return await e.openCamera(a)}async function f(){return r()?await e.closeCamera():{success:!0}}async function d(){if(!r())throw new Error("ScanMeCamera is only available on Android native APK.");return await e.capturePhoto()}async function M(){if(!r())throw new Error("ScanMeCamera is only available on Android native APK.");return await e.switchCamera()}async function C(a){if(!r())throw new Error("ScanMeCamera is only available on Android native APK.");return await e.setFlashMode({flashMode:a})}export{m as Z,M as a,d as b,f as c,r as i,l as o,u as r,C as s};
