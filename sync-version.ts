import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PackageJson {
  version: string;
}

interface TauriConfig {
  version: string;
  [key: string]: unknown;
}

// Read version from package.json
const packageJsonPath = join(__dirname, 'package.json');
const packageJson: PackageJson = JSON.parse(
  readFileSync(packageJsonPath, 'utf-8')
);
const version = packageJson.version;

if (!version) {
  console.error('Error: No version found in package.json');
  process.exit(1);
}

// Read and update tauri.conf.json
const tauriConfPath = join(__dirname, 'src-tauri', 'tauri.conf.json');
const tauriConf: TauriConfig = JSON.parse(
  readFileSync(tauriConfPath, 'utf-8')
);

// Update version
tauriConf.version = version;

// Write back to file with proper formatting
writeFileSync(
  tauriConfPath,
  JSON.stringify(tauriConf, null, 2) + '\n',
  'utf-8'
);

console.log(`✓ Synced version ${version} from package.json to tauri.conf.json`);
