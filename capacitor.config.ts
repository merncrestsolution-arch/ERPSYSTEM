import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dms.erp',
  appName: 'ERP_System',
  webDir: 'dist',
  // Web assets are bundled inside the APK so the app always opens (even on a
  // poor connection) with the latest fixed code. Supabase is still reached over
  // the network for login/data. Updates ship via the dashboard "Update App" button.
  server: {
    androidScheme: 'https'
  }
};

export default config;
