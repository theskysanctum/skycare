import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.skycare.app',
  appName: 'SkyCare',
  webDir: 'www',
  plugins: {
    CapacitorHttp: { enabled: true }
  }
};

export default config;
