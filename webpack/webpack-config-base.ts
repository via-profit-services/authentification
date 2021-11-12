import { Configuration } from 'webpack';

const webpackBaseConfig: Configuration = {
  target: 'node',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
      },
      {
        test: /\.graphql$/,
        use: 'raw-loader',
      },
    ],
  },
  node: {
    __filename: true,
    __dirname: true,
  },
  resolve: {
    extensions: ['.ts', '.js', '.graphql'],
  },
  externals: [/^@via-profit-services\/.*/, /^uuid$/, /^graphql$/],
};

export default webpackBaseConfig;
