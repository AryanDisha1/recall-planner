import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
const permission = '<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />';
let manifest = readFileSync(manifestPath, 'utf8');
if (!manifest.includes('android.permission.SCHEDULE_EXACT_ALARM')) {
  manifest = manifest.replace('</manifest>', `    ${permission}\n</manifest>`);
  writeFileSync(manifestPath, manifest);
}

const iconPath = 'android/app/src/main/res/drawable/ic_stat_recall.xml';
mkdirSync('android/app/src/main/res/drawable', { recursive: true });
writeFileSync(iconPath, `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24"><path android:fillColor="#FFFFFFFF" android:pathData="M3,4 L11,6 L11,20 L3,18 Z M13,6 L21,4 L21,18 L13,20 Z"/></vector>\n`);
