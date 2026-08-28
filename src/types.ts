export interface HomeItem {
  id: string;
  name: string;
  category: string;
  room: string;
  container: string;
  value: number | null;
  purchaseDate: string;
  serial: string;
  notes: string;
  photo?: Blob;
  photoName?: string;
  receipt?: Blob;
  receiptName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortableBlob {
  type: string;
  name?: string;
  data: string;
}

export interface PortableItem extends Omit<HomeItem, 'photo' | 'receipt'> {
  photo?: PortableBlob;
  receipt?: PortableBlob;
}

export interface BackupPayload {
  format: 'claim-ready-homebook';
  version: 1;
  exportedAt: string;
  items: PortableItem[];
}

export interface EncryptedBackup {
  format: 'claim-ready-homebook-encrypted';
  version: 1;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  cipher: { name: 'AES-GCM'; iv: string };
  ciphertext: string;
}

export type Route = 'inventory' | 'export' | 'guide' | 'privacy' | 'terms';

export interface LicenseState {
  token: string | null;
  valid: boolean;
  checking: boolean;
  notice: string;
}
