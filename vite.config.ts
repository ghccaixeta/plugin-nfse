import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { alvoDoBuild, manifestParaFirefox } from './build/manifest';

const raiz = resolve(import.meta.dirname, 'src');
const alvo = alvoDoBuild();

/** Copia `src/manifest.json` sem passar pelo bundler; no Firefox, convertido. */
function copiarManifest(): Plugin {
  return {
    name: 'copiar-manifest',
    generateBundle() {
      const texto = readFileSync(resolve(raiz, 'manifest.json'), 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source:
          alvo.navegador === 'firefox'
            ? `${JSON.stringify(manifestParaFirefox(JSON.parse(texto)), null, 2)}\n`
            : texto,
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
    outDir: resolve(import.meta.dirname, alvo.pastaSaida),
    emptyOutDir: true,
    // Chrome e Firefox suportam modulepreload nativamente; o polyfill só gera um arquivo a mais.
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
