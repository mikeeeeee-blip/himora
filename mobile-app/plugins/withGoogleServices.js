const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin to ensure google-services.json is copied to Android app directory
 * This ensures the file is available during the Gradle build process
 */
const withGoogleServices = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const platformProjectRoot = config.modRequest.platformProjectRoot;
      
      // Get the googleServicesFile path from config or use default
      const googleServicesFile = config.android?.googleServicesFile || './google-services.json';
      const sourcePath = path.resolve(projectRoot, googleServicesFile);
      const targetPath = path.join(platformProjectRoot, 'app', 'google-services.json');

      // Ensure the target directory exists
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Copy google-services.json if source exists
      if (fs.existsSync(sourcePath)) {
        console.log('📋 [withGoogleServices] Copying google-services.json to Android app directory...');
        console.log(`   From: ${sourcePath}`);
        console.log(`   To: ${targetPath}`);
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`✅ [withGoogleServices] Copied successfully`);
      } else {
        console.warn('⚠️  [withGoogleServices] google-services.json not found at:', sourcePath);
        console.warn('   Make sure the file exists in the project root or update googleServicesFile in app.json');
      }

      return config;
    },
  ]);
};

module.exports = withGoogleServices;

