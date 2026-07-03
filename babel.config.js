module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // react-native-reanimated (v4) requires the worklets plugin, listed last.
      'react-native-worklets/plugin',
    ],
  };
};
