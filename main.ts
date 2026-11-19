import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-frontend.ts';

const destination = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const submissionFolders = ['app', 'screenshots'] as const;
const limits = {
  text_max_bytes: 160 * 1024,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
};

function stageSubmission(target: string): void {
  // Read inputs relative to this file, independent of the invoking directory.
  mkdirSync(target, { recursive: true });
  for (const folder of submissionFolders) {
    cpSync(resolve(import.meta.dirname, folder), resolve(target, folder), { recursive: true });
  }
}

function emitDossier(target: string): void {
  const serialized = buildDossier(target, limits);
  const dossierPath = resolve(target, 'dossier.json');
  writeFileSync(dossierPath, serialized, 'utf8');
}

function assembleSubmission(target: string): void {
  // Build from the staged assets, so the dossier describes the delivered bytes.
  stageSubmission(target);
  emitDossier(target);
}

assembleSubmission(destination);
