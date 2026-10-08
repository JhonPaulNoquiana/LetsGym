const { withAndroidManifest } = require('expo/config-plugins');

module.exports = ({ config }) => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';

  // Android must explicitly allow HTTP when using a local development backend.
  // HTTPS builds keep Android's default transport protection.
  return withAndroidManifest(config, (nativeConfig) => {
    const application = nativeConfig.modResults.manifest.application?.[0];
    if (application) {
      application.$['android:usesCleartextTraffic'] = apiUrl.startsWith('http://')
        ? 'true'
        : 'false';
    }
    return nativeConfig;
  });
};
