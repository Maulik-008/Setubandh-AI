// Writes styles/paper-pastel-extras.css from src/theme/tokens.ts (Node strips the types).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderExtrasCss } from '../src/theme/extras.ts';

const target = fileURLToPath(new URL('../styles/paper-pastel-extras.css', import.meta.url));
writeFileSync(target, renderExtrasCss());
console.log(`[ok] ${target}`);
