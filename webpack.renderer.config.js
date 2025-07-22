const rules = require('./webpack.rules');

// --- 1. CSSローダー ---
rules.push({
  test: /\.css$/,
  use: [
    { loader: 'style-loader' },
    { loader: 'css-loader' }
  ]
});

// --- 2. React(JSX) + Babel ローダー ---
rules.push({
  test: /\.(js|jsx)$/,
  exclude: /node_modules/,
  use: {
    loader: 'babel-loader',
    options: {
      presets: [
        '@babel/preset-env',
        '@babel/preset-react'
      ]
    }
  }
});

module.exports = {
  module: {
    rules,
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  // --- 3. FastAPIサーバへのAPIリクエストをローカルにプロキシ ---
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
};