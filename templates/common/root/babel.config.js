module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Libraries such as zod v4 use `export * as ns from '…'`, which the RN preset doesn't transform.
    '@babel/plugin-transform-export-namespace-from',
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.ts', '.tsx', '.json'],
        // One alias per folder in src/ – keep in sync with "paths" in tsconfig.json.
        alias: {
{{BABEL_ALIASES}}
        },
      },
    ],
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: require('path').resolve(__dirname, '.env'),
        safe: false,
        allowUndefined: true,
      },
    ],
    // Must be the last plugin (required by react-native-reanimated 4).
    'react-native-worklets/plugin',
  ],
};
