import { beforeEach, describe, expect, it } from 'vitest';
import { criarPedidos, tratarMensagem, VALIDADE_MS } from '../../src/background/pedidos';
import type { DadosNota } from '../../src/dominio/tipos';
import { criarStorageFalso } from '../fakes/chrome-storage';

const DPS = 'https://www.nfse.gov.br/EmissorNacional/DPS';
const URL_ETAPA = {
  pessoas: `${DPS}/Pessoas`,
  servico: `${DPS}/Servico?idr=x`,
  valores: `${DPS}/Tributacao?idr=x`,
  conferencia: `${DPS}/EmitirNFSe?idr=x`,
};
const TAB = 7;
const T0 = 1_000_000;
const MIN = 60_000;

const dados: DadosNota = {
  cnpjTomador: '11222333000181',
  valorCentavos: 1000,
  descricao: 'x',
  dataCompetencia: '09/11/2026',
  codigoTributacao: '010101',
  nbs: '115029000',
  enquadramento: 'meepp',
  regime: 1,
  aliquotaCentesimos: 201,
};

let storage: ReturnType<typeof criarStorageFalso>;
let pedidos: ReturnType<typeof criarPedidos>;

beforeEach(async () => {
  storage = criarStorageFalso();
  pedidos = criarPedidos(storage.area);
});

const temPedido = () => storage.dados.has(`pedido:${TAB}`);

/** Cria o pedido e conclui etapas até chegar à `etapa` esperada. */
async function esperando(etapa: 'pessoas' | 'servico' | 'valores' | 'conferencia', agora = T0) {
  await pedidos.criarPedido(TAB, dados, agora);
  const ordem = ['pessoas', 'servico', 'valores', 'conferencia'];
  for (let i = 0; i < ordem.indexOf(etapa); i++) await pedidos.concluirEtapa(TAB, agora, 'Goianésia/GO');
}

describe('fluxo normal (NFSE-07)', () => {
  it('NFSE-07 Pessoas → Serviço → Valores → Conferência, com a próxima etapa calculada pelo SW', async () => {
    await pedidos.criarPedido(TAB, dados, T0);
    expect(await pedidos.obterPedido(TAB, URL_ETAPA.pessoas, T0)).toEqual({ executar: { etapa: 'pessoas', dados } });

    await pedidos.concluirEtapa(TAB, T0, 'Goianésia/GO');
    expect(await pedidos.obterPedido(TAB, URL_ETAPA.servico, T0)).toEqual({
      executar: { etapa: 'servico', dados, municipioEmitente: 'Goianésia/GO' },
    });

    await pedidos.concluirEtapa(TAB, T0);
    expect(await pedidos.obterPedido(TAB, URL_ETAPA.valores, T0)).toMatchObject({
      executar: { etapa: 'valores', municipioEmitente: 'Goianésia/GO' },
    });

    await pedidos.concluirEtapa(TAB, T0);
    expect(await pedidos.obterPedido(TAB, URL_ETAPA.conferencia, T0)).toEqual({ conferencia: true });
    expect(temPedido()).toBe(false);
  });

  it('pedidos de abas diferentes não se misturam', async () => {
    await pedidos.criarPedido(TAB, dados, T0);
    expect(await pedidos.obterPedido(TAB + 1, URL_ETAPA.pessoas, T0)).toBeNull();
  });

  it('criarPedido de novo recomeça do zero', async () => {
    await esperando('servico');
    await pedidos.criarPedido(TAB, dados, T0);
    expect(await pedidos.obterPedido(TAB, URL_ETAPA.pessoas, T0)).toEqual({ executar: { etapa: 'pessoas', dados } });
  });

  it('concluirEtapa na Conferência não avança além dela', async () => {
    await esperando('conferencia');
    await pedidos.concluirEtapa(TAB, T0);
    expect(await pedidos.obterPedido(TAB, URL_ETAPA.conferencia, T0)).toEqual({ conferencia: true });
  });
});

describe('validade (casos limite)', () => {
  it('Pessoas sem pedido não é tocada', async () => {
    expect(await pedidos.obterPedido(TAB, URL_ETAPA.pessoas, T0)).toBeNull();
  });

  it('pedido parado há mais de 10 minutos é descartado', async () => {
    await pedidos.criarPedido(TAB, dados, T0);
    expect(await pedidos.obterPedido(TAB, URL_ETAPA.pessoas, T0 + VALIDADE_MS + 1)).toBeNull();
    expect(temPedido()).toBe(false);
  });

  it('pedido com exatamente 10 minutos ainda vale', async () => {
    await pedidos.criarPedido(TAB, dados, T0);
    expect(await pedidos.obterPedido(TAB, URL_ETAPA.pessoas, T0 + VALIDADE_MS)).not.toBeNull();
  });

  it('os 10 minutos contam da última atividade, não da criação', async () => {
    await pedidos.criarPedido(TAB, dados, T0);
    await pedidos.concluirEtapa(TAB, T0 + 9 * MIN);
    expect(await pedidos.obterPedido(TAB, URL_ETAPA.servico, T0 + 15 * MIN)).toMatchObject({
      executar: { etapa: 'servico' },
    });
  });
});

describe('etapa inesperada e recusa do portal (NFSE-08)', () => {
  it('NFSE-08 usuário voltou depois de a próxima etapa carregar → etapaInesperada', async () => {
    await esperando('valores');
    await pedidos.obterPedido(TAB, URL_ETAPA.valores, T0);
    expect(await pedidos.obterPedido(TAB, URL_ETAPA.servico, T0)).toEqual({ erro: 'etapaInesperada', etapa: 'servico' });
    expect(temPedido()).toBe(false);
  });

  it.each([
    ['pulou etapa', 'servico', URL_ETAPA.valores, 'valores'],
    ['Conferência fora de hora', 'valores', URL_ETAPA.conferencia, 'conferencia'],
    ['página de DPS desconhecida', 'servico', `${DPS}/Outra`, null],
  ] as const)('NFSE-08 %s → etapaInesperada (com a etapa da página) e o pedido é apagado', async (_, esperada, url, etapa) => {
    await esperando(esperada);
    expect(await pedidos.obterPedido(TAB, url, T0)).toEqual({ erro: 'etapaInesperada', etapa });
    expect(temPedido()).toBe(false);
  });

  it('NFSE-08 a etapa recém-concluída recarregou (portal recusou o Avançar) → recusadoPeloPortal com a etapa', async () => {
    await esperando('servico');
    expect(await pedidos.obterPedido(TAB, URL_ETAPA.pessoas, T0)).toEqual({ erro: 'recusadoPeloPortal', etapa: 'pessoas' });
    expect(temPedido()).toBe(false);
  });
});

describe('navegação e encerramento', () => {
  it.each([
    'https://www.nfse.gov.br/EmissorNacional/',
    'https://www.nfse.gov.br/EmissorNacional/Notas/Emitidas',
    'https://www.google.com/',
  ])('sair de /DPS/ (%s) descarta o pedido', async (url) => {
    await pedidos.criarPedido(TAB, dados, T0);
    await pedidos.urlMudou(TAB, url);
    expect(temPedido()).toBe(false);
  });

  it('navegar dentro de /DPS/ mantém o pedido', async () => {
    await pedidos.criarPedido(TAB, dados, T0);
    await pedidos.urlMudou(TAB, URL_ETAPA.servico);
    expect(temPedido()).toBe(true);
  });

  it('encerrar apaga o pedido', async () => {
    await pedidos.criarPedido(TAB, dados, T0);
    await pedidos.encerrar(TAB);
    expect(temPedido()).toBe(false);
  });

  it('concluirEtapa e pausar sem pedido não criam nada', async () => {
    await pedidos.concluirEtapa(TAB, T0);
    await pedidos.pausar(TAB, T0);
    expect(temPedido()).toBe(false);
  });

  it('concluirEtapa e encerrar disparados juntos: o encerrar vence (operações em fila)', async () => {
    await pedidos.criarPedido(TAB, dados, T0);
    await Promise.all([pedidos.concluirEtapa(TAB, T0), pedidos.encerrar(TAB)]);
    expect(temPedido()).toBe(false);
  });
});

describe('pausa do código complementar (NFSE-09)', () => {
  beforeEach(async () => {
    await esperando('servico');
    await pedidos.pausar(TAB, T0 + 5 * MIN);
  });

  it('NFSE-09 após avançar manualmente, retoma na etapa Valores', async () => {
    expect(await pedidos.obterPedido(TAB, URL_ETAPA.valores, T0 + 5 * MIN)).toMatchObject({
      executar: { etapa: 'valores', dados },
    });
  });

  it('NFSE-09 a pausa renova a validade (o usuário pode levar até 10 min para escolher)', async () => {
    expect(await pedidos.obterPedido(TAB, URL_ETAPA.valores, T0 + 14 * MIN)).toMatchObject({
      executar: { etapa: 'valores' },
    });
  });

  it('NFSE-09 Serviço recarregado durante a pausa não toca na página e mantém o pedido', async () => {
    expect(await pedidos.obterPedido(TAB, URL_ETAPA.servico, T0)).toBeNull();
    expect(temPedido()).toBe(true);
  });

  it('NFSE-09 voltar para Pessoas durante a pausa é inesperado', async () => {
    expect(await pedidos.obterPedido(TAB, URL_ETAPA.pessoas, T0)).toEqual({ erro: 'etapaInesperada', etapa: 'pessoas' });
  });

  it('NFSE-09 depois de retomar em Valores, a pausa acaba: voltar para Serviço é inesperado', async () => {
    await pedidos.concluirEtapa(TAB, T0 + 6 * MIN);
    expect(await pedidos.obterPedido(TAB, URL_ETAPA.servico, T0 + 6 * MIN)).toEqual({ erro: 'etapaInesperada', etapa: 'servico' });
  });
});

describe('tratarMensagem (wiring do runtime.onMessage)', () => {
  const doContent = (url: string, tabId = TAB) => ({ tab: { id: tabId }, url });
  const doPainel = {};

  it('painel cria pedido com tabId explícito; content script usa a aba do sender', async () => {
    await tratarMensagem(pedidos, { tipo: 'criarPedido', tabId: TAB, dados }, doPainel, T0);
    expect(await tratarMensagem(pedidos, { tipo: 'obterPedido' }, doContent(URL_ETAPA.pessoas), T0)).toEqual({
      executar: { etapa: 'pessoas', dados },
    });
  });

  it('concluirEtapa responde { concluido: true } só quando gravou (a ponte só deixa avançar assim)', async () => {
    const msg = { tipo: 'concluirEtapa' } as const;
    expect(await tratarMensagem(pedidos, msg, doContent(URL_ETAPA.pessoas), T0)).toBeNull();
    await pedidos.criarPedido(TAB, dados, T0);
    expect(await tratarMensagem(pedidos, msg, doContent(URL_ETAPA.pessoas), T0)).toEqual({ concluido: true });
  });

  it('concluirEtapa e encerrar usam a aba do sender', async () => {
    await pedidos.criarPedido(TAB, dados, T0);
    await tratarMensagem(pedidos, { tipo: 'concluirEtapa', municipioEmitente: 'Goianésia/GO' }, doContent(URL_ETAPA.pessoas), T0);
    expect(await pedidos.obterPedido(TAB, URL_ETAPA.servico, T0)).toMatchObject({
      executar: { municipioEmitente: 'Goianésia/GO' },
    });
    await tratarMensagem(pedidos, { tipo: 'encerrar' }, doContent(URL_ETAPA.servico), T0);
    expect(temPedido()).toBe(false);
  });

  it('painel encerra o pedido de uma aba pelo tabId (iniciar falhou)', async () => {
    await pedidos.criarPedido(TAB, dados, T0);
    await tratarMensagem(pedidos, { tipo: 'encerrar', tabId: TAB }, doPainel, T0);
    expect(temPedido()).toBe(false);
  });

  it('content script não escolhe outra aba pelo corpo da mensagem', async () => {
    await pedidos.criarPedido(TAB, dados, T0);
    await tratarMensagem(pedidos, { tipo: 'encerrar', tabId: TAB }, doContent(URL_ETAPA.pessoas, TAB + 1), T0);
    expect(temPedido()).toBe(true);
  });

  it('mensagem sem aba identificável é ignorada', async () => {
    expect(await tratarMensagem(pedidos, { tipo: 'obterPedido' }, {}, T0)).toBeNull();
  });
});
