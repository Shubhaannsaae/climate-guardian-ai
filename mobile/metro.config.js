const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for additional file extensions
config.resolver.assetExts.push(
  // Adds support for `.db` files for SQLite databases
  'db',
  // Adds support for `.bin` files for ML models
  'bin',
  // Adds support for `.obj` and `.mtl` files for 3D models
  'obj',
  'mtl'
);

// Add support for TypeScript
config.resolver.sourceExts.push('ts', 'tsx');

module.exports = config;
