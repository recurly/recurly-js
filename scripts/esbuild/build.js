'use strict';

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const babelPlugin = require('./babel-plugin');
const { babelOptions } = require('./babel-config');

const minify = process.argv.includes('--minify');
const root = path.join(__dirname, '..', '..');
const outdir = path.join(root, 'build');

fs.mkdirSync(outdir, { recursive: true });

const ATTRIBUTION_URL = 'https://docs.recurly.com/page/open-source-attribution';
const banner = `/*! License information available at ${ATTRIBUTION_URL} */`;

async function buildJs () {
  await esbuild.build({
    entryPoints: [path.join(root, 'index.js')],
    outfile: path.join(outdir, minify ? 'recurly.min.js' : 'recurly.js'),
    bundle: true,
    format: 'iife',
    globalName: 'recurly',
    // webpack's `output.libraryExport: 'default'` made window.recurly === the singleton instance.
    // esbuild's IIFE returns { default: instance }; this footer unwraps it.
    footer: { js: 'recurly = recurly.default;' },
    banner: { js: banner },
    legalComments: 'none',
    minify,
    sourcemap: false,
    target: ['es5'],
    loader: { '.css': 'empty', '.json': 'json' },
    define: {
      'process.env.NODE_ENV': JSON.stringify(minify ? 'production' : 'development'),
    },
    plugins: [babelPlugin({ babelOptions: babelOptions({ instrument: false }) })],
    logLevel: 'info',
  });
}

async function buildCss () {
  await esbuild.build({
    entryPoints: [path.join(root, 'lib', 'recurly.css')],
    outfile: path.join(outdir, 'recurly.css'),
    bundle: true,
    minify,
    legalComments: 'none',
    logLevel: 'info',
  });
}

function writeLicenseSidecar () {
  if (!minify) return;
  fs.writeFileSync(
    path.join(outdir, 'recurly.min.js.LICENSE.txt'),
    `License information available at ${ATTRIBUTION_URL}\n`
  );
}

(async () => {
  await Promise.all([buildJs(), buildCss()]);
  writeLicenseSidecar();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
