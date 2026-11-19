import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-frontend.ts';

// Resolve inputs beside the entrypoint, regardless of the caller's directory.
const entryRoot = import.meta.dirname;
const outputRoot = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const assetDirectories = ['app', 'screenshots'] as const;
const dossierLimits = {
  text_max_bytes: 160 * 1024,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
};

function copyEntryAssets(destination: string): void {
  mkdirSync(destination, { recursive: true });
  for (const directory of assetDirectories) {
    cpSync(resolve(entryRoot, directory), resolve(destination, directory), { recursive: true });
  }
}

function writeEntryDossier(destination: string): void {
  // Scan the staged copy so the dossier and delivered assets describe the same bytes.
  const dossierText = buildDossier(destination, dossierLimits);
  writeFileSync(resolve(destination, 'dossier.json'), dossierText, 'utf8');
}

function buildOfflineSubmission(destination: string): void {
  // Copy first: the dossier must never describe an older staged catalog or stylesheet.
  copyEntryAssets(destination);
  writeEntryDossier(destination);
}

buildOfflineSubmission(outputRoot);
