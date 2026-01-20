import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const nodePackageJsonPath = path.join(repoRoot, 'package.json');
export const PACKAGE_NAME = JSON.parse(fs.readFileSync(nodePackageJsonPath, 'utf8')).name;

export const testDir = __dirname;

let _api = null;

export async function loadApi() {
  if (_api) return _api;

  try {
    _api = await import(PACKAGE_NAME);
  } catch (e) {
    const fallback = path.join(repoRoot, 'dist/index.js');
    if (fs.existsSync(fallback)) {
      console.warn(`Failed to import "${PACKAGE_NAME}", falling back to ${fallback}`);
      _api = await import(pathToFileURL(fallback).href);
    } else {
      throw e;
    }
  }
  return _api;
}
