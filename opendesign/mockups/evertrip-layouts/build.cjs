const path = require('node:path');
require('../../../frontend/node_modules/esbuild').buildSync({
  entryPoints: [path.join(__dirname, 'App.jsx')],
  nodePaths: [path.resolve(__dirname, '../../../frontend/node_modules')],
  bundle: true, minify: true, outfile: path.join(__dirname, 'prototype.js'),
  define: {'process.env.NODE_ENV': JSON.stringify('production')},
});
