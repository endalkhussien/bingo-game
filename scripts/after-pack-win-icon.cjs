/**
 * Embed Waliya icon into the packaged Windows .exe after pack.
 * Used because signAndEditExecutable is disabled to avoid winCodeSign symlink errors
 * on Windows without Developer Mode / admin privileges.
 */
const fs = require('fs');
const path = require('path');

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;

  const { appOutDir, packager } = context;
  const projectDir = packager.projectDir;
  const iconPath = path.join(projectDir, 'build', 'icon.ico');

  if (!fs.existsSync(iconPath)) {
    throw new Error(`Missing build/icon.ico — run npm run pack:win (syncs icon before build)`);
  }

  const exeName = `${packager.appInfo.productFilename}.exe`;
  const exePath = path.join(appOutDir, exeName);

  if (!fs.existsSync(exePath)) {
    const candidates = fs.readdirSync(appOutDir).filter((f) => f.endsWith('.exe'));
    throw new Error(`Expected ${exeName} in ${appOutDir}. Found: ${candidates.join(', ') || 'none'}`);
  }

  let rcedit;
  try {
    rcedit = require('rcedit');
  } catch {
    throw new Error('Missing rcedit — run: npm install');
  }

  const productName = packager.appInfo.productName;
  const version = packager.appInfo.version || '1.0.0';

  await rcedit(exePath, {
    icon: iconPath,
    'version-string': {
      CompanyName: 'Waliya',
      FileDescription: productName,
      ProductName: productName,
      InternalName: productName,
      OriginalFilename: exeName,
    },
    'file-version': `${version}.0`,
    'product-version': `${version}.0`,
  });

  console.log(`→ Embedded app icon into ${exeName}`);
};
