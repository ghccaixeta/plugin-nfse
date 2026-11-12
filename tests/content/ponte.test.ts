// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MensagemSW, RespostaPedido } from '../../src/background/pedidos';
import { ID_BANNER } from '../../src/content/banner';
import { iniciarPonte as iniciarPonteReal } from '../../src/content/ponte';
import { EVENTOS, emitir, ouvir, type ResultadoExecucao } from '../../src/content/protocolo';
import type { DadosNota } from '../../src/dominio/tipos';

const dados = { cnpjTomador: '11222333000181' } as DadosNota;

/** SW falso: responde `obterPedido` com a resposta programada e registra o resto. */
function swFalso(resposta: RespostaPedido, concluir: RespostaPedido = { concluido: true }) {
  const mensagens: MensagemSW[] = [];
  const enviar = async (msg: MensagemSW): Promise<RespostaPedido> => {
    mensagens.push(msg);
    if (msg.tipo === 'concluirEtapa') return concluir;
    return msg.tipo === 'obterPedido' ? resposta : null;
  };
  return { enviar, mensagens, tipos: () => mensagens.map((m) => m.tipo) };
}

/** Preenchedor falso no "mundo MAIN": registra os pedidos de execução recebidos. */
function preenchedorFalso() {
  const execucoes: unknown[] = [];
  ouvir(document, EVENTOS.executar, (p) => execucoes.push(p));
  ouvir(document, EVENTOS.ping, () => emitir(document, EVENTOS.pronto, {}));
  return { execucoes, pronto: () => emitir(document, EVENTOS.pronto, {}) };
}

const textoBanner = () => document.getElementById(ID_BANNER)?.shadowRoot?.textContent ?? null;
const resultado = (r: ResultadoExecucao) => emitir(document, EVENTOS.resultado, r);
const esperarMicrotarefas = () => new Promise((r) => setTimeout(r, 0));

// Cada ponte ouve o document; desligar ao fim evita que uma ponte de outro teste responda.
const pontes: ReturnType<typeof iniciarPonteReal>[] = [];
const iniciarPonte = (...args: Parameters<typeof iniciarPonteReal>) => {
  const ponte = iniciarPonteReal(...args);
  pontes.push(ponte);
  return ponte;
};
afterEach(() => {
  for (const p of pontes.splice(0)) p.desligar();
});

beforeEach(() => {
  document.body.innerHTML = '';
  document.getElementById(ID_BANNER)?.remove();
});

describe('ponte — handshake', () => {
  it('só dispara executar depois do nfse:pronto (preenchedor carrega depois)', async () => {
    const sw = swFalso({ executar: { etapa: 'pessoas', dados } });
    const ponte = iniciarPonte({ enviar: sw.enviar });
    const execucoes: unknown[] = [];
    ouvir(document, EVENTOS.executar, (p) => execucoes.push(p));
    await ponte.verificar();
    expect(execucoes).toEqual([]);
    emitir(document, EVENTOS.pronto, {});
    expect(execucoes).toEqual([{ etapa: 'pessoas', dados }]);
  });

  it('preenchedor que carregou antes responde ao ping da ponte', async () => {
    const main = preenchedorFalso();
    const sw = swFalso({ executar: { etapa: 'servico', dados, municipioEmitente: 'Goianésia/GO' } });
    await iniciarPonte({ enviar: sw.enviar }).verificar();
    expect(main.execucoes).toEqual([{ etapa: 'servico', dados, municipioEmitente: 'Goianésia/GO' }]);
  });

  it('não dispara duas vezes se verificar for chamado de novo durante a execução', async () => {
    const main = preenchedorFalso();
    const ponte = iniciarPonte({ enviar: swFalso({ executar: { etapa: 'pessoas', dados } }).enviar });
    await ponte.verificar();
    await ponte.verificar();
    expect(main.execucoes).toHaveLength(1);
  });
});

describe('ponte — respostas do SW', () => {
  it('sem pedido não faz nada (Pessoas sem clicar em Preencher)', async () => {
    const main = preenchedorFalso();
    await iniciarPonte({ enviar: swFalso(null).enviar }).verificar();
    expect(main.execucoes).toEqual([]);
    expect(textoBanner()).toBeNull();
  });

  it('NFSE-07 Conferência → banner de sucesso com o texto da spec', async () => {
    const main = preenchedorFalso();
    await iniciarPonte({ enviar: swFalso({ conferencia: true }).enviar }).verificar();
    expect(textoBanner()).toContain('Preenchido. Confira os dados e clique em Emitir NFS-e.');
    expect(main.execucoes).toEqual([]);
  });

  it('NFSE-08 portal recusou o Avançar → banner com a etapa e as mensagens de validação da página', async () => {
    document.body.innerHTML = `
      <label for="Valores_ValorServico">Valor do serviço prestado</label>
      <span class="field-validation-error" data-valmsg-for="Valores.ValorServico">Campo obrigatório</span>`;
    await iniciarPonte({
      enviar: swFalso({ erro: 'recusadoPeloPortal', etapa: 'valores' }).enviar,
    }).verificar();
    expect(textoBanner()).toContain('Etapa Valores: o portal recusou os dados. Valor do serviço prestado: Campo obrigatório');
  });

  it('NFSE-08 portal recusou sem mensagem visível → banner pede para conferir a página', async () => {
    await iniciarPonte({
      enviar: swFalso({ erro: 'recusadoPeloPortal', etapa: 'pessoas' }).enviar,
    }).verificar();
    expect(textoBanner()).toContain('Etapa Pessoas: o portal recusou os dados. Confira os avisos na página.');
  });

  it('NFSE-08 etapa inesperada → banner de erro com a etapa', async () => {
    await iniciarPonte({
      enviar: swFalso({ erro: 'etapaInesperada', etapa: 'servico' }).enviar,
    }).verificar();
    expect(textoBanner()).toContain('Etapa Serviço');
    expect(textoBanner()).toMatch(/cancelado/i);
  });
});

describe('ponte — resultados do preenchedor', () => {
  async function executando(etapa: 'pessoas' | 'servico' | 'valores') {
    preenchedorFalso();
    const sw = swFalso({ executar: { etapa, dados } });
    await iniciarPonte({ enviar: sw.enviar }).verificar();
    return sw;
  }

  it('ok com próxima etapa → concluirEtapa no SW com o município do emitente', async () => {
    const sw = await executando('pessoas');
    const confirmacoes: unknown[] = [];
    ouvir(document, EVENTOS.continuar, (c) => confirmacoes.push(c));
    resultado({ ok: true, municipioEmitente: 'Goianésia/GO' });
    await esperarMicrotarefas();
    expect(sw.mensagens.at(-1)).toEqual({ tipo: 'concluirEtapa', municipioEmitente: 'Goianésia/GO' });
    expect(confirmacoes).toHaveLength(1); // só depois de o SW gravar
  });

  it('SW não gravou a etapa → não confirma o Avançar, encerra e avisa', async () => {
    preenchedorFalso();
    const sw = swFalso({ executar: { etapa: 'pessoas', dados } }, null);
    const confirmacoes: unknown[] = [];
    ouvir(document, EVENTOS.continuar, (c) => confirmacoes.push(c));
    await iniciarPonte({ enviar: sw.enviar }).verificar();
    resultado({ ok: true });
    await esperarMicrotarefas();
    expect(confirmacoes).toEqual([]);
    expect(sw.tipos().at(-1)).toBe('encerrar');
    expect(textoBanner()).toContain('Etapa Pessoas: a extensão não conseguiu registrar a etapa');
  });

  it('NFSE-08 falha → encerrar + banner "Etapa Serviço: Código de tributação não encontrado"', async () => {
    const sw = await executando('servico');
    resultado({ ok: false, etapa: 'servico', mensagem: 'Código de tributação não encontrado' });
    await esperarMicrotarefas();
    expect(sw.tipos().at(-1)).toBe('encerrar');
    expect(textoBanner()).toContain('Etapa Serviço: Código de tributação não encontrado');
  });

  it('NFSE-08 falha depois do ok (erro de validação após Avançar) → encerrar', async () => {
    const sw = await executando('valores');
    resultado({ ok: true });
    resultado({ ok: false, etapa: 'valores', mensagem: 'Valor do serviço: Campo obrigatório' });
    await esperarMicrotarefas();
    expect(sw.tipos().slice(-2)).toEqual(['concluirEtapa', 'encerrar']);
    expect(textoBanner()).toContain('Etapa Valores: Valor do serviço: Campo obrigatório');
  });

  it('NFSE-09 pausa → pausar no SW + banner pedindo o código complementar', async () => {
    const sw = await executando('servico');
    resultado({ ok: true, pausa: 'codigoComplementar' });
    await esperarMicrotarefas();
    expect(sw.tipos().at(-1)).toBe('pausar');
    expect(textoBanner()).toContain('Selecione o Código Complementar Municipal e clique em Avançar para continuar');
  });

  it('resultado sem execução em andamento é ignorado (evento forjado pela página)', async () => {
    const sw = swFalso(null);
    await iniciarPonte({ enviar: sw.enviar }).verificar();
    resultado({ ok: true });
    await esperarMicrotarefas();
    expect(sw.tipos()).toEqual(['obterPedido']);
  });
});

describe('banner', () => {
  it('fica em shadow DOM e é substituído a cada aviso', async () => {
    const ponte = iniciarPonte({ enviar: swFalso({ conferencia: true }).enviar });
    await ponte.verificar();
    await ponte.verificar();
    expect(document.querySelectorAll(`#${ID_BANNER}`)).toHaveLength(1);
    expect(document.body.textContent).not.toContain('Preenchido');
  });
});
