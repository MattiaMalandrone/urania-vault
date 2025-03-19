import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.matix.uraniavault',
  appName: 'urania-vault',
  webDir: 'dist/urania-vault/browser',
  plugins: {
    Camera: {
      allowEditing: false,
      resultType: 'uri',
      quality: 90,
    }
  }
};

export default config;
