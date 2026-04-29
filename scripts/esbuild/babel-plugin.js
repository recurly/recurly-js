'use strict';

const fs = require('fs/promises');
const path = require('path');
const babel = require('@babel/core');

// Skip node_modules (matched webpack's `exclude: /node_modules/`) and the esbuild scripts
// directory itself (those files are build infrastructure, not library source).
const SKIP = /node_modules|scripts[/\\]esbuild/;

module.exports = function babelPlugin ({ babelOptions }) {
  return {
    name: 'babel',
    setup (build) {
      const cache = new Map();

      build.onLoad({ filter: /\.(js|cjs|mjs)$/ }, async args => {
        if (SKIP.test(args.path)) return null;

        const stat = await fs.stat(args.path);
        const cached = cache.get(args.path);
        if (cached && cached.mtimeMs === stat.mtimeMs) {
          return { contents: cached.code, loader: 'js' };
        }

        const source = await fs.readFile(args.path, 'utf8');
        const result = await babel.transformAsync(source, {
          ...babelOptions,
          filename: args.path,
          cwd: path.join(__dirname, '..', '..'),
        });
        const code = result ? result.code : source;
        cache.set(args.path, { mtimeMs: stat.mtimeMs, code });
        return { contents: code, loader: 'js' };
      });
    },
  };
};
