import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const path = (relative) => fileURLToPath(new URL(relative, import.meta.url));
const source = path('../assets/src/evidence-vault.png');
const icon = path('../assets/src/homebook-mark.svg');
await sharp(source).resize(1200, 630, { fit: 'cover', position: 'attention' }).jpeg({ quality: 84, progressive: true }).toFile(path('../public/sf-claim-ready-homebook-social.jpg'));
await sharp(icon).resize(180, 180).png().toFile(path('../public/apple-touch-icon.png'));
