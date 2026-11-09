import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Etapas 2 e 3 do build: um content script por execução (`--mode ponte` ou
// `--mode preenchedor`). Content scripts não carregam ES modules e o formato
// IIFE não aceita múltiplas entradas, por isso um build por script. No Vite 8
// o IIFE já sai sem code splitting (tudo inline num arquivo).
const SCRIPTS = ['ponte', 'preenchedor'] as const;

export default defineConfig(({ mode }) => {
  const nome = SCRIPTS.find((s) => s === mode);
  if (!nome) throw new Error(`Use --mode ${SCRIPTS.join(' | ')} (recebido: ${mode})`);

  return {
    publicDir: false,
    build: {
      outDir: resolve(import.meta.dirname, 'dist'),
      emptyOutDir: false,
      lib: {
        entry: resolve(import.meta.dirname, `src/content/${nome}.ts`),
        formats: ['iife'],
        name: `nfse_${nome}`,
        fileName: () => `${nome}.js`,
      },
    },
  };
});
