import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const path = (relative) => fileURLToPath(new URL(relative, import.meta.url));
const source = path('../assets/src/evidence-vault.png');
await sharp(source).resize(1280, 853, { fit: 'cover' }).avif({ quality: 50 }).toFile(path('../public/assets/evidence-vault-1280.avif'));
await sharp(source).resize(768, 512, { fit: 'cover' }).avif({ quality: 46 }).toFile(path('../public/assets/evidence-vault-768.avif'));
const icon = path('../assets/src/homebook-mark.svg');
await sharp(icon).resize(192, 192).png().toFile(path('../public/icon-192.png'));
await sharp(icon).resize(512, 512).png().toFile(path('../public/icon-512.png'));
await sharp(icon).resize(410, 410).extend({ top: 51, bottom: 51, left: 51, right: 51, background: '#0B1016' }).png().toFile(path('../public/icon-maskable-512.png'));
