import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const from = fileURLToPath(new URL('../../design/tokens.css', import.meta.url));
const to = fileURLToPath(new URL('../public/css/tokens.css', import.meta.url));
copyFileSync(from, to);
console.log('tokens.css disalin ke backend/public/css/');
