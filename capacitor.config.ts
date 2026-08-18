import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'eu.dbuilder.plans',
  appName: 'Plans',
  webDir: 'dist',
  server: {
    url: 'https://plans.dbuilder.eu',
    androidScheme: 'https'
  }
};

export default config;
