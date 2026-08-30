import type { UserConfig } from 'tsdown'

const packageId = 'dsh-ima-copilot'

const client: UserConfig = {
  name: `${packageId}/client`,
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  dts: false,
  sourcemap: true,
  clean: false,
  deps: {
    neverBundle: [/^@deepseek-ai\//, /^react(?:\/|$)/],
  },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(packageId)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

const host: UserConfig = {
  name: `${packageId}/host`,
  entry: { index: 'src/index.ts' },
  outDir: 'lib',
  format: 'esm',
  platform: 'node',
  target: 'node22.19',
  dts: false,
  sourcemap: true,
  clean: false,
  deps: { neverBundle: true },
  outputOptions: { entryFileNames: 'index.js' },
}

export default [client, host]
