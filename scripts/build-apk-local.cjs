const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const architecture = process.argv[2] || 'arm64-v8a';
if (!['arm64-v8a', 'armeabi-v7a', 'x86_64', 'all'].includes(architecture)) {
  console.error('Architecture must be arm64-v8a, armeabi-v7a, x86_64, or all.');
  process.exit(1);
}
if (!fs.existsSync(path.join(root, 'credentials.json'))) {
  console.error('Download the existing Android credentials first: npx eas-cli credentials --platform android');
  process.exit(1);
}
const env = { ...process.env, CI: '1', NODE_ENV: 'production' };
if (!env.ANDROID_HOME && process.platform === 'win32' && env.LOCALAPPDATA) {
  env.ANDROID_HOME = path.join(env.LOCALAPPDATA, 'Android', 'Sdk');
}
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    console.error('Local build stopped. Check the build output above.');
    process.exit(result.status || 1);
  }
}
run(process.execPath, [path.join(root, 'node_modules/expo/bin/cli'), 'prebuild', '--platform', 'android', '--no-install', '--no-clean', '--skip-dependency-update', 'expo,react,react-native']);
const args = [':app:assembleRelease', '--init-script', '../scripts/local-release-signing.gradle', '--console=plain'];
if (architecture !== 'all') args.push(`-PreactNativeArchitectures=${architecture}`);
if (process.platform === 'win32') run('cmd.exe', ['/d', '/c', 'gradlew.bat', ...args], path.join(root, 'android'));
else run('./gradlew', args, path.join(root, 'android'));
const output = path.join(root, '.expo/local-release');
fs.mkdirSync(output, { recursive: true });
const apk = path.join(output, 'pocket-ledger.apk');
fs.copyFileSync(path.join(root, 'android/app/build/outputs/apk/release/app-release.apk'), apk);
console.log(`Signed standalone APK: ${apk}`);
