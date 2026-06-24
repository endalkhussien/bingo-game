/**
 * Embed Waliya icon into the packaged Windows .exe after pack.
 * Uses rcedit-x64.exe from node_modules (no require('rcedit') — works even if JS entry fails).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function resolveRceditExe(projectDir) {
  const candidates = [
    path.join(projectDir, 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe'),
    path.join(projectDir, 'node_modules', 'rcedit', 'bin', 'rcedit.exe'),
    path.join(projectDir, 'build', 'rcedit-x64.exe'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function runRcedit(rceditExe, exePath, iconPath, productName, exeName, version) {
  const args = [
    exePath,
    '--set-icon', iconPath,
    '--set-version-string', 'CompanyName', 'Waliya',
    '--set-version-string', 'FileDescription', productName,
    '--set-version-string', 'ProductName', productName,
    '--set-version-string', 'InternalName', productName,
    '--set-version-string', 'OriginalFilename', exeName,
    '--set-file-version', `${version}.0`,
    '--set-product-version', `${version}.0`,
  ];

  const result = spawnSync(rceditExe, args, { stdio: 'inherit', windowsHide: true });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`rcedit exited with code ${result.status ?? 'unknown'}`);
  }
}

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;

  const { appOutDir, packager } = context;
  const projectDir = packager.projectDir;
  const iconPath = path.join(projectDir, 'build', 'icon.ico');

  if (!fs.existsSync(iconPath)) {
    throw new Error('Missing build/icon.ico — run npm run pack:win (syncs icon before build)');
  }

  const exeName = `${packager.appInfo.productFilename}.exe`;
  const exePath = path.join(appOutDir, exeName);

  if (!fs.existsSync(exePath)) {
    const candidates = fs.readdirSync(appOutDir).filter((f) => f.endsWith('.exe'));
    throw new Error(`Expected ${exeName} in ${appOutDir}. Found: ${candidates.join(', ') || 'none'}`);
  }

  const rceditExe = resolveRceditExe(projectDir);
  if (!rceditExe) {
    throw new Error(
      'Missing rcedit binary. From the project folder run:\n' +
      '  npm install\n' +
      'Then run:\n' +
      '  npm run pack:win',
    );
  }

  const productName = packager.appInfo.productName;
  const version = packager.appInfo.version || '1.0.0';

  runRcedit(rceditExe, exePath, iconPath, productName, exeName, version);
  console.log(`→ Embedded app icon into ${exeName}`);
};
