'use strict';

const esbuild = require('esbuild');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const babelPlugin = require('./babel-plugin');
const { babelOptions } = require('./babel-config');

const root = path.join(__dirname, '..', '..');
const outdir = path.join(root, 'build');
const PORT = 8020;

const certFile = process.env.RECURLY_JS_CERT;
const keyFile = process.env.RECURLY_JS_KEY;
const useHttps = Boolean(certFile && keyFile);

(async () => {
  const ctx = await esbuild.context({
    entryPoints: [path.join(root, 'index.js')],
    outfile: path.join(outdir, 'recurly.js'),
    bundle: true,
    format: 'iife',
    globalName: 'recurly',
    footer: { js: 'recurly = recurly.default;' },
    target: ['es5'],
    loader: { '.css': 'empty', '.json': 'json' },
    define: { 'process.env.NODE_ENV': JSON.stringify('development') },
    plugins: [babelPlugin({ babelOptions: babelOptions({ instrument: false }) })],
    sourcemap: 'inline',
    logLevel: 'info',
  });

  await ctx.watch();

  // esbuild's built-in serve doesn't support custom headers.
  // Proxy through Node http(s) to inject Cross-Origin-Resource-Policy.
  const esbuildServer = await ctx.serve({ host: '127.0.0.1', servedir: root });

  function proxyRequest (clientReq, clientRes) {
    const esbuildHost = esbuildServer.hosts[0];
    const options = {
      hostname: esbuildHost,
      port: esbuildServer.port,
      path: clientReq.url,
      method: clientReq.method,
      headers: {
        ...clientReq.headers,
        host: `${esbuildHost}:${esbuildServer.port}`,
      },
    };

    const proxyReq = http.request(options, proxyRes => {
      clientRes.writeHead(proxyRes.statusCode, {
        ...proxyRes.headers,
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Access-Control-Allow-Origin': '*',
      });
      proxyRes.pipe(clientRes, { end: true });
    });

    clientReq.pipe(proxyReq, { end: true });
    proxyReq.on('error', err => {
      console.error('Proxy error:', err.message);
      clientRes.writeHead(502);
      clientRes.end();
    });
  }

  let server;
  if (useHttps) {
    server = https.createServer({
      cert: fs.readFileSync(certFile),
      key: fs.readFileSync(keyFile),
    }, proxyRequest);
  } else {
    server = http.createServer(proxyRequest);
  }

  server.listen(PORT, '0.0.0.0', () => {
    const protocol = useHttps ? 'https' : 'http';
    console.log(`esbuild dev server at ${protocol}://localhost:${PORT}`);
  });
})().catch(err => {
  console.error(err);
  process.exit(1);
});
