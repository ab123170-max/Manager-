import { supabase } from '../lib/supabaseClient';

const keyCache = new Map<string, CryptoKey>();
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getUserKey(userId: string): Promise<CryptoKey> {
  const cached = keyCache.get(userId);
  if (cached) return cached;

  const { data, error } = await supabase.rpc('get_my_encryption_key');
  if (error || !data) {
    throw new Error(error?.message || 'Unable to initialize your encryption key.');
  }

  const raw = base64ToBytes(String(data));
  if (raw.byteLength !== 32) {
    throw new Error('Invalid encryption key returned by Supabase.');
  }

  const key = await crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );

  keyCache.set(userId, key);
  return key;
}

export async function encryptUserData(userId: string, value: unknown): Promise<string> {
  if (!userId) throw new Error('A signed-in user is required for encryption.');

  const key = await getUserKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = textEncoder.encode(JSON.stringify(value));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  );

  // Versioned envelope: v1 + IV + ciphertext.
  return `v1.${bytesToBase64(iv)}.${bytesToBase64(ciphertext)}`;
}

export async function decryptUserData<T>(userId: string, payload: string): Promise<T> {
  if (!userId) throw new Error('A signed-in user is required for decryption.');
  if (!payload?.startsWith('v1.')) throw new Error('Unsupported encrypted payload.');

  const parts = payload.split('.');
  if (parts.length !== 3) throw new Error('Malformed encrypted payload.');

  const key = await getUserKey(userId);
  const iv = base64ToBytes(parts[1]);
  const ciphertext = base64ToBytes(parts[2]);

  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(textDecoder.decode(plaintext)) as T;
}

export function clearEncryptionKeyCache(userId?: string) {
  if (userId) keyCache.delete(userId);
  else keyCache.clear();
}
