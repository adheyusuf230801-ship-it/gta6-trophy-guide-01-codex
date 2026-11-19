import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repository = import.meta.dirname;
const submissionFolders = ['app', 'screenshots'] as const;
const limits = {
  text_max_bytes: 160 * 1024,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
};

function stageSubmission(destination: string) {
  mkdirSync(destination, { recursive: true });
  for (const folder of submissionFolders) {
    cpSync(resolve(repository, folder), resolve(destination, folder), { recursive: true });
  }
}

const destination = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
stageSubmission(destination);
// The dossier describes the staged bytes, including the original screenshots.
const dossier = buildDossier(destination, limits);
writeFileSync(resolve(destination, 'dossier.json'), dossier);
