import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const raiz = resolve(import.meta.dirname, 'src');

/** Copia `src/manifest.json` para `dist/` sem passar pelo bundler. */
function copiarManifest(): Plugin {
  return {
    name: 'copiar-manifest',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: readFileSync(resolve(raiz, 'manifest.json'), 'utf8'),
      });
    },
  };
}

// Etapa 1 do build: popup, opções e service worker (ES modules).
// Os content scripts (IIFE) saem de `vite.content.config.ts`.
export default defineConfig({
  root: raiz,
  publicDir: false,
  plugins: [copiarManifest()],
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    // Chrome suporta modulepreload nativamente; o polyfill só gera um arquivo a mais.
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: {
        popup: resolve(raiz, 'popup/index.html'),
        opcoes: resolve(raiz, 'opcoes/index.html'),
        sw: resolve(raiz, 'background/sw.ts'),
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js'),
      },
    },
  },
});
