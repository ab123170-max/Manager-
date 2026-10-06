/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */function n(r){return new Promise((e,t)=>{const a=new FileReader;a.onload=()=>{typeof a.result=="string"?e(a.result):t(new Error("Failed to read file as base64 string."))},a.onerror=s=>t(s),a.readAsDataURL(r)})}function i(r){const e=r.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);return e?{mimeType:e[1],base64Data:e[2]}:{mimeType:"image/jpeg",base64Data:r}}export{n as f,i as p};
