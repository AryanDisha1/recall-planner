import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.recall.studyplanner',
  appName: 'Recall',
  webDir: 'dist',
  backgroundColor: '#f5f4ef',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_recall',
      iconColor: '#284e3d',
    },
  },
};

export default config;
