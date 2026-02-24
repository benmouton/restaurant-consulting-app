import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alstiginc.restaurantconsultant',
  appName: 'The Restaurant Consultant',
  webDir: 'dist/public',
  server: {
    url: 'https://restaurantai.consulting',
    allowNavigation: ['restaurantai.consulting']
  }
};

export default config;
