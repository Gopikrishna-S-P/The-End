const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The local `call-recording` Expo module lives under ./modules and is linked into
// node_modules as a symlink (file: dependency). Metro resolves node_modules against
// its own crawled file index rather than a live fs.stat call, and a symlinked
// directory doesn't get reported back as type "d" there -- so plain Node (and tsc)
// resolve `call-recording` fine, but Metro's bundler throws "could not be found
// within the project" at bundle time. `unstable_enableSymlinks` alone doesn't fix
// this (verified); explicitly mapping the package name to its real path via
// extraNodeModules sidesteps the symlink walk entirely.
config.resolver.unstable_enableSymlinks = true;
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'call-recording': path.resolve(__dirname, 'modules/call-recording'),
};

module.exports = config;
