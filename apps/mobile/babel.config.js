// Babel + NativeWind v4 (jsxImportSource) + Expo Router.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@abastece/types': '../../packages/types',
            '@abastece/utils': '../../packages/utils',
          },
        },
      ],
      // Reanimated precisa ser o último plugin.
      'react-native-reanimated/plugin',
    ],
  };
};
