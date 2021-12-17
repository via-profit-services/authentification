import { Configuration } from 'webpack';

const webpackBaseConfig: Configuration = {
  target: 'node',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  externals: [/^@via-profit-services\/.*/, 'uuid', 'graphql', 'jsonwebtoken'],
};

export default webpackBaseConfig;
