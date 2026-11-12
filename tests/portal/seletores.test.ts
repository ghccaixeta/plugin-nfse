// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CHOSEN,
  PESSOAS,
  SERVICO,
  VALORES,
  encontrarAvancar,
  type Campo,
} from '../../src/portal/seletores';

function fixture(nome: string): Document {
  const html = readFileSync(resolve(import.meta.dirname, '../fixtures', `${nome}.html`), 'utf8');
  return new DOMParser().parseFromString(html, 'text/html');
}

const casos: [string, Record<string, Campo>][] = [
  ['pessoas', PESSOAS],
  ['servico', SERVICO],
  ['valores', VALORES],
];

describe.each(casos)('seletores da etapa %s (NFSE-04..07)', (nome, campos) => {
  const doc = fixture(nome);

  it.each(Object.entries(campos))('%s existe na fixture', (_, campo) => {
    expect(doc.querySelector(campo.css), campo.css).not.toBeNull();
  });

  it('todo campo tem nome legível para o aviso de erro (NFSE-08)', () => {
    for (const campo of Object.values(campos)) expect(campo.nome.trim()).not.toBe('');
  });
});

describe('encontrarAvancar', () => {
  it.each(['pessoas', 'servico', 'valores'])('acha o botão Avançar em %s', (nome) => {
    const botao = encontrarAvancar(fixture(nome));
    expect(botao?.tagName).toBe('BUTTON');
    expect(botao?.textContent?.trim()).toBe('Avançar');
  });

  it('não acha Avançar na Conferência, onde só existe o Emitir (NFSE-07)', () => {
    expect(fixture('emitir').querySelector('#btnProsseguir')?.textContent).toContain('Emitir NFS-e');
    expect(encontrarAvancar(fixture('emitir'))).toBeNull();
  });
});

describe('tipos de componente esperados pelas primitivas', () => {
  it('Chosen e Select2 são <select>; radios são input radio dentro de label', () => {
    const pessoas = fixture('pessoas');
    const servico = fixture('servico');
    const valores = fixture('valores');
    for (const [doc, campo] of [
      [pessoas, PESSOAS.regime],
      [servico, SERVICO.municipioPrestacao],
      [servico, SERVICO.codigoTributacao],
      [servico, SERVICO.nbs],
      [valores, VALORES.pisCofinsSituacao],
      [valores, VALORES.pisCofinsRetencao],
    ] as const) {
      expect(doc.querySelector(campo.css)?.tagName, campo.css).toBe('SELECT');
    }
    // Chosen inicializado: container irmão `<id>_chosen` (acoes.selecionarChosen espera por ele).
    for (const [doc, campo] of [
      [pessoas, PESSOAS.regime],
      [servico, SERVICO.nbs],
      [valores, VALORES.pisCofinsSituacao],
      [valores, VALORES.pisCofinsRetencao],
    ] as const) {
      const id = doc.querySelector(campo.css)!.id;
      expect(doc.getElementById(id + CHOSEN.sufixoContainer), campo.css).not.toBeNull();
    }
    for (const [doc, campo] of [
      [pessoas, PESSOAS.ibsCbsNao],
      [servico, SERVICO.imunidadeNao],
      [valores, VALORES.retencaoIssqnNao],
      [valores, VALORES.tributosAliquotaSN],
    ] as const) {
      const input = doc.querySelector<HTMLInputElement>(campo.css);
      expect(input?.type, campo.css).toBe('radio');
      expect(input?.closest('label'), campo.css).not.toBeNull();
    }
  });
});
