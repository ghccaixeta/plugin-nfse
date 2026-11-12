// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { iniciarPreenchedor } from '../../src/content/preenchedor';
import { EVENTOS, emitir, ouvir, type ResultadoExecucao } from '../../src/content/protocolo';
import type { DadosNota } from '../../src/dominio/tipos';
import { SERVICO, VALORES } from '../../src/portal/seletores';
import { criarAcoesFalsas } from '../fakes/acoes';

const dados: DadosNota = {
  cnpjTomador: '11222333000181',
  valorCentavos: 1000,
  descricao: 'x',
  dataCompetencia: '09/11/2026',
  codigoTributacao: '010101',
  nbs: '115029000',
  regime: 1,
  aliquotaCentesimos: 201,
};

let resultados: ResultadoExecucao[];
let pararDeOuvir: () => void;
let pararDeConfirmar: () => void;
let parar: () => void;

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '';
  resultados = [];
  pararDeOuvir = ouvir(document, EVENTOS.resultado, (r) => resultados.push(r));
  // Ponte falsa: confirma cada etapa concluída, como a real depois de gravar no SW.
  pararDeConfirmar = ouvir(document, EVENTOS.resultado, (r) => {
    if (r.ok && !('pausa' in r)) emitir(document, EVENTOS.continuar, {});
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  parar?.();
  pararDeOuvir();
  pararDeConfirmar();
  vi.useRealTimers();
});

function iniciar(acoes = criarAcoesFalsas()) {
  parar = iniciarPreenchedor({ acoes: acoes.acoes });
  return acoes;
}

describe('preenchedor', () => {
  it('só começa a preencher depois do load da página (o portal termina de se montar no ready)', async () => {
    const estado = vi.spyOn(document, 'readyState', 'get').mockReturnValue('interactive');
    const falsas = iniciar();
    emitir(document, EVENTOS.executar, { etapa: 'valores', dados });
    await vi.advanceTimersByTimeAsync(1000);
    expect(falsas.chamadas).toEqual([]);
    estado.mockReturnValue('complete');
    window.dispatchEvent(new Event('load'));
    await vi.advanceTimersByTimeAsync(10);
    expect(falsas.chamadas[0]?.[0]).toBe('digitarMascarado');
  });

  it('emite nfse:pronto ao iniciar e ao receber ping', () => {
    const prontos: unknown[] = [];
    const deixar = ouvir(document, EVENTOS.pronto, (p) => prontos.push(p));
    iniciar();
    emitir(document, EVENTOS.ping, {});
    expect(prontos).toHaveLength(2);
    deixar();
  });

  it('responde ok com a próxima etapa ANTES de clicar em Avançar', async () => {
    const falsas = criarAcoesFalsas();
    const ordem: string[] = [];
    ouvir(document, EVENTOS.resultado, () => ordem.push('resultado'));
    const clicar = falsas.acoes.clicarAvancar;
    falsas.acoes.clicarAvancar = async () => {
      ordem.push('avancar');
      await clicar();
    };
    iniciar(falsas);
    emitir(document, EVENTOS.executar, { etapa: 'valores', dados });
    await vi.advanceTimersByTimeAsync(0);
    expect(resultados[0]).toEqual({ ok: true });
    expect(ordem.slice(0, 2)).toEqual(['resultado', 'avancar']);
  });

  it('Pessoas devolve o município do emitente no resultado', async () => {
    iniciar(criarAcoesFalsas({ valores: { 'Município do emitente': 'Goianésia/GO' } }));
    emitir(document, EVENTOS.executar, { etapa: 'pessoas', dados });
    await vi.advanceTimersByTimeAsync(0);
    expect(resultados[0]).toEqual({ ok: true, municipioEmitente: 'Goianésia/GO' });
  });

  it('Serviço recebe o município do emitente guardado no pedido', async () => {
    const falsas = iniciar(criarAcoesFalsas());
    emitir(document, EVENTOS.executar, { etapa: 'servico', dados, municipioEmitente: 'Goianésia/GO' });
    await vi.advanceTimersByTimeAsync(0);
    expect(falsas.chamadas[0]).toEqual([
      'selecionarSelect2Ajax',
      SERVICO.municipioPrestacao.nome,
      'Goianésia',
      { exato: 'Goianésia/GO' },
    ]);
  });

  it('NFSE-09 pausa → resultado de pausa e não clica em Avançar', async () => {
    const falsas = iniciar(criarAcoesFalsas({ valores: { [SERVICO.codigoComplementarObrigatorio.nome]: 'True' } }));
    emitir(document, EVENTOS.executar, { etapa: 'servico', dados, municipioEmitente: 'Goianésia/GO' });
    await vi.advanceTimersByTimeAsync(0);
    expect(resultados).toEqual([{ ok: true, pausa: 'codigoComplementar' }]);
    expect(falsas.chamadas.map((c) => c[0])).not.toContain('clicarAvancar');
  });

  it('NFSE-08 FalhaCampo → resultado de falha com etapa e mensagem, sem avançar', async () => {
    const falsas = iniciar(criarAcoesFalsas({ falharEm: VALORES.aliquotaSN.nome }));
    emitir(document, EVENTOS.executar, { etapa: 'valores', dados });
    await vi.advanceTimersByTimeAsync(0);
    expect(resultados).toEqual([{ ok: false, etapa: 'valores', mensagem: 'Alíquota do Simples Nacional não encontrado' }]);
    expect(falsas.chamadas.map((c) => c[0])).not.toContain('clicarAvancar');
  });

  it('NFSE-08 erro de validação: navegação não começa em 15 s e há .field-validation-error → falha com o rótulo', async () => {
    document.body.innerHTML = `
      <label for="Valores_ValorServico">Valor do serviço prestado</label>
      <input id="Valores_ValorServico" name="Valores.ValorServico">
      <span class="field-validation-error" data-valmsg-for="Valores.ValorServico">Campo obrigatório</span>`;
    iniciar();
    emitir(document, EVENTOS.executar, { etapa: 'valores', dados });
    await vi.advanceTimersByTimeAsync(14_000);
    expect(resultados).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1_100);
    expect(resultados[1]).toEqual({
      ok: false,
      etapa: 'valores',
      mensagem: 'o portal recusou os dados. Valor do serviço prestado: Campo obrigatório',
    });
  });

  it('Avançar não navegou e não há erro visível: falha genérica depois de 15 s (não fica preso)', async () => {
    document.body.innerHTML = '<span class="field-validation-error" data-valmsg-for="X"></span>';
    iniciar();
    emitir(document, EVENTOS.executar, { etapa: 'valores', dados });
    await vi.advanceTimersByTimeAsync(16_000);
    expect(resultados[1]).toEqual({
      ok: false,
      etapa: 'valores',
      mensagem: 'o portal recusou os dados. Confira os avisos na página.',
    });
  });

  it('só clica em Avançar depois que a ponte confirma (nfse:continuar)', async () => {
    pararDeConfirmar();
    const falsas = iniciar();
    emitir(document, EVENTOS.executar, { etapa: 'valores', dados });
    await vi.advanceTimersByTimeAsync(1000);
    expect(resultados).toEqual([{ ok: true }]);
    expect(falsas.chamadas.map((c) => c[0])).not.toContain('clicarAvancar');
    emitir(document, EVENTOS.continuar, {});
    await vi.advanceTimersByTimeAsync(0);
    expect(falsas.chamadas.map((c) => c[0])).toContain('clicarAvancar');
  });

  it('sem confirmação da ponte em 5 s: falha e não avança', async () => {
    pararDeConfirmar();
    const falsas = iniciar();
    emitir(document, EVENTOS.executar, { etapa: 'valores', dados });
    await vi.advanceTimersByTimeAsync(5_100);
    expect(resultados[1]).toMatchObject({ ok: false, etapa: 'valores' });
    expect(falsas.chamadas.map((c) => c[0])).not.toContain('clicarAvancar');
  });

  it('se a navegação começou (beforeunload), não falha mesmo que o portal demore', async () => {
    document.body.innerHTML = '<span class="field-validation-error" data-valmsg-for="X">Campo obrigatório</span>';
    iniciar();
    emitir(document, EVENTOS.executar, { etapa: 'valores', dados });
    await vi.advanceTimersByTimeAsync(10);
    window.dispatchEvent(new Event('beforeunload'));
    await vi.advanceTimersByTimeAsync(16_000);
    expect(resultados).toHaveLength(1);
  });

  it('detail que não é JSON válido é ignorado', async () => {
    const falsas = iniciar();
    document.dispatchEvent(new CustomEvent(EVENTOS.executar, { detail: '{lixo' }));
    await vi.advanceTimersByTimeAsync(0);
    expect(falsas.chamadas).toEqual([]);
    expect(resultados).toEqual([]);
  });
});
