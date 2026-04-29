'use strict';

const esbuild = require('esbuild');
const glob = require('glob');
const fs = require('fs');
const path = require('path');
const babelPlugin = require('./babel-plugin');
const { babelOptions } = require('./babel-config');

const root = path.join(__dirname, '..', '..');
const outdir = path.join(root, 'build');

fs.mkdirSync(outdir, { recursive: true });

const specs = glob.sync('test/unit/**/*.test.js', { cwd: root, absolute: true });
if (specs.length === 0) {
  console.error('No test specs found under test/unit/**/*.test.js');
  process.exit(1);
}

const stdinContents = specs.map(p => `import ${JSON.stringify(p)};`).join('\n') + '\n';

esbuild.build({
  stdin: {
    contents: stdinContents,
    resolveDir: root,
    sourcefile: 'test-entry.generated.js',
    loader: 'js',
  },
  outfile: path.join(outdir, 'test-unit.js'),
  bundle: true,
  format: 'iife',
  sourcemap: 'inline',
  loader: { '.json': 'json', '.css': 'empty' },
  inject: [path.join(__dirname, 'process-shim.js')],
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
    // Tests spy on `global`; this define maps it to globalThis so the spy works in browser scope.
    'global': 'globalThis',
  },
  plugins: [babelPlugin({ babelOptions: babelOptions() })],
  logLevel: 'info',
}).catch(err => {
  console.error(err);
  process.exit(1);
});
