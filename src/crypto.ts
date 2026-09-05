import type { BackupPayload, EncryptedBackup, HomeItem, PortableBlob, PortableItem } from './types';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ITERATIONS = 250_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function blobToPortable(blob: Blob, name?: string): Promise<PortableBlob> {
  const data = bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
  return { type: blob.type || 'application/octet-stream', name, data };
}

function portableToBlob(blob: PortableBlob): Blob {
  return new Blob([base64ToBytes(blob.data)], { type: blob.type });
}

export async function createPayload(items: HomeItem[]): Promise<BackupPayload> {
  const portableItems: PortableItem[] = await Promise.all(items.map(async item => ({
    ...item,
    photo: item.photo ? await blobToPortable(item.photo, item.photoName) : undefined,
    receipt: item.receipt ? await blobToPortable(item.receipt, item.receiptName) : undefined
  })));
  return { format: 'claim-ready-homebook', version: 1, exportedAt: new Date().toISOString(), items: portableItems };
}

export function restorePayload(payload: BackupPayload): HomeItem[] {
  if (payload.format !== 'claim-ready-homebook' || payload.version !== 1 || !Array.isArray(payload.items)) {
    throw new Error('This is not a supported Homebook backup.');
  }
  const requiredStrings: (keyof PortableItem)[] = ['id', 'name', 'category', 'room', 'container', 'purchaseDate', 'serial', 'notes', 'createdAt', 'updatedAt'];
  const valid = payload.items.every(item => item && typeof item === 'object'
    && requiredStrings.every(key => typeof item[key] === 'string')
    && item.name.trim().length > 0
    && (item.value === null || (typeof item.value === 'number' && Number.isFinite(item.value) && item.value >= 0 && item.value <= 100_000_000))
    && (!item.photo || (typeof item.photo.type === 'string' && typeof item.photo.data === 'string'))
    && (!item.receipt || (typeof item.receipt.type === 'string' && typeof item.receipt.data === 'string')));
  if (!valid) throw new Error('This backup contains an invalid item record. Export the file again from Homebook.');
  return payload.items.map(item => ({
    ...item,
    photo: item.photo ? portableToBlob(item.photo) : undefined,
    photoName: item.photo?.name ?? item.photoName,
    receipt: item.receipt ? portableToBlob(item.receipt) : undefined,
    receiptName: item.receipt?.name ?? item.receiptName
  }));
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptPayload(payload: BackupPayload, passphrase: string): Promise<EncryptedBackup> {
  if (passphrase.length < 10) throw new Error('Use a passphrase with at least 10 characters.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(payload)));
  return {
    format: 'claim-ready-homebook-encrypted', version: 1,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: bytesToBase64(salt) },
    cipher: { name: 'AES-GCM', iv: bytesToBase64(iv) },
    ciphertext: bytesToBase64(new Uint8Array(ciphertext))
  };
}

export async function decryptPayload(backup: EncryptedBackup, passphrase: string): Promise<BackupPayload> {
  if (backup.format !== 'claim-ready-homebook-encrypted' || backup.version !== 1) {
    throw new Error('This is not a supported encrypted Homebook backup.');
  }
  try {
    const salt = base64ToBytes(backup.kdf.salt);
    const iv = base64ToBytes(backup.cipher.iv);
    const key = await deriveKey(passphrase, salt);
    const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, base64ToBytes(backup.ciphertext));
    return JSON.parse(decoder.decode(clear)) as BackupPayload;
  } catch {
    throw new Error('That passphrase did not open this backup, or the file is damaged.');
  }
}
