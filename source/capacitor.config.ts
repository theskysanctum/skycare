import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.takingcare.guide',
  appName: 'SkyCare',
  webDir: 'www',
  plugins: {
    CapacitorHttp: { enabled: true }
  }
};

export default config;
