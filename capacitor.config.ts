import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dms.erp',
  appName: 'ERP_System',
  webDir: 'dist',
  server: {
    url: 'https://electron-app-beta.vercel.app',
    cleartext: false
  }
};

export default config;
