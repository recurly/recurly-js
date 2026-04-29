import { playwrightLauncher } from '@web/test-runner-playwright';
import { createRequire } from 'module';
import { build as esbuildBuild } from 'esbuild';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __projectRoot = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
require('@recurly/public-api-test-server');

const KNOWN_EXTENSIONS = /\.(js|ts|jsx|tsx|css|json|html|mjs|cjs)$/i;
const ESM_BUNDLE_PREFIX = '/__esm/';
const esbundleCache = new Map();

const ASSERT_SHIM_PATH = '/__assert-shim.js';
const PROMISE_SHIM_PATH = '/__promise-shim.js';

function shimPlugins() {
  return [
    {
      name: 'assert-shim',
      serve(c) { if(c.path===ASSERT_SHIM_PATH) return {body:'function ok(v,m){if(!v)throw new Error(m||v);}const a=ok;a.ok=ok;a.equal=(x,y,m)=>{if(x!=y)throw new Error(m||(x+\" != \"+y));};a.strictEqual=(x,y,m)=>{if(x!==y)throw new Error(m||(x+\" !== \"+y));};a.notEqual=(x,y,m)=>{if(x==y)throw new Error(m);};a.notStrictEqual=(x,y,m)=>{if(x===y)throw new Error(m);};a.deepEqual=(x,y,m)=>{if(JSON.stringify(x)!==JSON.stringify(y))throw new Error(m);};a.deepStrictEqual=(x,y,m)=>{if(JSON.stringify(x)!==JSON.stringify(y))throw new Error(m);};a.notDeepEqual=(x,y,m)=>{if(JSON.stringify(x)===JSON.stringify(y))throw new Error(m);};a.throws=(f,r,m)=>{try{f();}catch(e){if(r instanceof RegExp&&!r.test(e.message))throw new Error(m);return;}throw new Error(m||"Expected throw");};a.doesNotThrow=(f,m)=>{try{f();}catch(e){throw new Error(m||e.message);}};a.fail=(m)=>{throw new Error(m);};a.match=(s,r,m)=>{if(!r.test(s))throw new Error(m);};export default a;',type:'js'}; },
      resolveImport({source}) { if(source==='assert') return ASSERT_SHIM_PATH; if(source==='promise') return PROMISE_SHIM_PATH; },
    },
    {
      name: 'promise-shim',
      serve(c) {
        if(c.path!==PROMISE_SHIM_PATH) return;
        return {body:`if(!Promise.prototype.done){Promise.prototype.done=function(){const s=arguments.length?this.then(...arguments):this;s.then(null,e=>{setTimeout(()=>{throw e},0);});};}if(!Promise.prototype.nodeify){Promise.prototype.nodeify=function(cb,ctx){if(typeof cb!=='function')return this;this.then(v=>{queueMicrotask(()=>cb.call(ctx,null,v));},e=>{queueMicrotask(()=>cb.call(ctx,e));});return this;};}export default Promise;`,type:'js'};
      },
    },
  ];
}

function esbuildBundlePlugin() {
  return {
    name: 'esbuild-bundle',
    resolveImport({source}) {
      if(source.startsWith('.')||source.startsWith('/')||source.startsWith('http')) return;
      if(source==='assert'||source==='promise'||source==='sinon') return;
      return `${ESM_BUNDLE_PREFIX}${encodeURIComponent(source)}.js`;
    },
    async serve(context) {
      if(!context.path.startsWith(ESM_BUNDLE_PREFIX)) return;
      const pkgName = decodeURIComponent(context.path.slice(ESM_BUNDLE_PREFIX.length,-3));
      if(esbundleCache.has(pkgName)) return {body:esbundleCache.get(pkgName),type:'js'};
      try {
        const result = await esbuildBuild({entryPoints:[pkgName],bundle:true,format:'esm',platform:'browser',write:false,define:{'process.env.NODE_ENV':'"test"'},loader:{'.json':'json'}});
        const body = result.outputFiles[0].text;
        esbundleCache.set(pkgName,body);
        return {body,type:'js'};
      } catch(err) {
        console.error('[esbuild] FAILED:',pkgName,err.message);
      }
    },
  };
}

function addExtensionPlugin() {
  return {
    name: 'add-js-extension',
    resolveImport({source, context}) {
      if(!source.startsWith('.')&&!source.startsWith('/')) return;
      if(KNOWN_EXTENSIONS.test(source)) return;
      try {
        const importerPath = context.path.replace(/\?.*$/,'');
        const importerDir = path.dirname(importerPath.startsWith('/') ? importerPath.slice(1) : importerPath);
        const resolved = path.resolve(__projectRoot, importerDir, source);
        if(existsSync(resolved+'.js')) {
          const abs = '/'+path.relative(__projectRoot, resolved+'.js');
          console.log('[addExt]',source,'->', abs, 'from', importerPath);
          return abs;
        }
        if(existsSync(path.join(resolved,'index.js'))) {
          const abs = '/'+path.relative(__projectRoot, path.join(resolved,'index.js'));
          console.log('[addExt]',source,'-> index',abs, 'from', importerPath);
          return abs;
        }
        console.warn('[addExt] NOT FOUND:',source,'from',importerPath,'->',resolved);
      } catch(e) {
        console.error('[addExt] ERROR:',source,e.message);
      }
    },
  };
}

export default {
  files: 'test/unit/errors.test.js',
  browsers: [playwrightLauncher({product:'chromium'})],
  plugins: [...shimPlugins(), esbuildBundlePlugin(), addExtensionPlugin()],
  testFramework: {config:{timeout:7000}},
  testRunnerHtml: f => `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script src="/node_modules/sinon/pkg/sinon.js"></script><script type="module" src="${f}"></script></body></html>`,
  browserStartTimeout: 60000, testsStartTimeout: 60000, testsFinishTimeout: 120000,
};
