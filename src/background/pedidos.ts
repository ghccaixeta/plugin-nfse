// Máquina de estados do preenchimento, um pedido por aba em `chrome.storage.session`.
// Só o service worker acessa; content scripts e popup falam por mensagem.
import type { AreaArmazenamento } from '../armazenamento/repositorio';
import { dentroDaEmissao, etapaAnterior, etapaDaUrl, proximaEtapa } from '../dominio/etapas';
import type { DadosNota, Etapa, Pedido, PedidoExecucao } from '../dominio/tipos';

interface AreaSessao extends AreaArmazenamento {
  remove(chaves: string | string[]): Promise<void>;
}

/** Caso limite: pedido pendente há mais de 10 min é descartado. */
export const VALIDADE_MS = 10 * 60 * 1000;

export type RespostaPedido =
  | { executar: PedidoExecucao }
  | { conferencia: true }
  | { concluido: true } // resposta de concluirEtapa quando o SW gravou a próxima etapa
  | { erro: 'etapaInesperada'; etapa: Etapa | null }
  | { erro: 'recusadoPeloPortal'; etapa: Etapa } // a etapa anterior recarregou: validação do portal
  | null;

export type MensagemSW =
  | { tipo: 'criarPedido'; tabId: number; dados: DadosNota }
  | { tipo: 'obterPedido' }
  | { tipo: 'concluirEtapa'; municipioEmitente?: string }
  | { tipo: 'pausar' }
  | { tipo: 'encerrar'; tabId?: number }; // tabId: só vale vindo do painel

const chave = (tabId: number) => `pedido:${tabId}`;

export function criarPedidos(area: AreaSessao) {
  // Operações da mesma aba rodam uma por vez: sem isso, um concluirEtapa
  // (ler → gravar) intercalado com um encerrar recriaria o pedido apagado.
  const filas = new Map<number, Promise<unknown>>();
  function emFila<T>(tabId: number, operacao: () => Promise<T>): Promise<T> {
    const resultado = (filas.get(tabId) ?? Promise.resolve()).then(operacao);
    const fim = resultado.catch(() => undefined);
    filas.set(tabId, fim);
    void fim.then(() => filas.get(tabId) === fim && filas.delete(tabId));
    return resultado;
  }

  async function ler(tabId: number): Promise<Pedido | undefined> {
    return (await area.get(chave(tabId)))[chave(tabId)] as Pedido | undefined;
  }
  const gravar = (tabId: number, pedido: Pedido) => area.set({ [chave(tabId)]: pedido });
  const apagar = (tabId: number) => area.remove(chave(tabId));

  /** Aplica a mudança se o pedido existe; diz se gravou. */
  async function atualizar(tabId: number, mudar: (pedido: Pedido) => Partial<Pedido>): Promise<boolean> {
    const pedido = await ler(tabId);
    if (!pedido) return false;
    await gravar(tabId, { ...pedido, ...mudar(pedido) });
    return true;
  }

  return {
    criarPedido(tabId: number, dados: DadosNota, agora: number): Promise<void> {
      return emFila(tabId, () => gravar(tabId, { dados, etapaEsperada: 'pessoas', fase: 'preenchendo', atualizadoEm: agora }));
    },

    /** Chamado pela ponte ao carregar cada página da emissão. */
    obterPedido(tabId: number, url: string, agora: number): Promise<RespostaPedido> {
      return emFila(tabId, async (): Promise<RespostaPedido> => {
        const pedido = await ler(tabId);
        if (!pedido) return null;
        if (agora - pedido.atualizadoEm > VALIDADE_MS) {
          await apagar(tabId);
          return null;
        }

        const etapa = etapaDaUrl(url);
        // NFSE-09: durante a pausa, Serviço pode recarregar (ex.: erro no Avançar manual).
        if (pedido.fase === 'pausado' && etapa === 'servico') return null;

        if (etapa !== pedido.etapaEsperada) {
          await apagar(tabId); // evita loop: nunca preencher a mesma etapa duas vezes
          const recusado = pedido.fase === 'avancando' && etapa !== null && etapa === etapaAnterior(pedido.etapaEsperada);
          return recusado ? { erro: 'recusadoPeloPortal', etapa } : { erro: 'etapaInesperada', etapa };
        }
        if (etapa === 'conferencia') {
          await apagar(tabId);
          return { conferencia: true };
        }
        await gravar(tabId, { ...pedido, fase: 'preenchendo' });
        return { executar: { etapa, dados: pedido.dados, municipioEmitente: pedido.municipioEmitente } };
      });
    },

    /** A etapa esperada foi preenchida: o SW decide a próxima (não confia na página). Diz se gravou. */
    concluirEtapa(tabId: number, agora: number, municipioEmitente?: string): Promise<boolean> {
      return emFila(tabId, () =>
        atualizar(tabId, (p) => ({
          etapaEsperada: proximaEtapa(p.etapaEsperada) ?? p.etapaEsperada,
          fase: 'avancando',
          atualizadoEm: agora,
          ...(municipioEmitente && { municipioEmitente }),
        })),
      );
    },

    /** NFSE-09: o usuário escolhe o código complementar e avança; retomamos em Valores. */
    pausar(tabId: number, agora: number): Promise<boolean> {
      return emFila(tabId, () => atualizar(tabId, () => ({ etapaEsperada: 'valores', fase: 'pausado', atualizadoEm: agora })));
    },

    /** Caso limite: sair de /DPS/ (home, outra emissão) descarta o preenchimento. */
    urlMudou(tabId: number, url: string): Promise<void> {
      return emFila(tabId, async () => {
        if (!dentroDaEmissao(url)) await apagar(tabId);
      });
    },

    encerrar(tabId: number): Promise<void> {
      return emFila(tabId, () => apagar(tabId));
    },
  };
}

export type Pedidos = ReturnType<typeof criarPedidos>;

/**
 * Roteia uma mensagem. Content script fica preso à própria aba (`sender.tab`);
 * só o painel, que não tem aba, informa o `tabId` no corpo.
 */
export async function tratarMensagem(
  pedidos: Pedidos,
  msg: MensagemSW,
  sender: { tab?: { id?: number }; url?: string },
  agora: number,
): Promise<RespostaPedido> {
  const tabId = sender.tab ? sender.tab.id : 'tabId' in msg ? msg.tabId : undefined;
  if (tabId === undefined) return null;

  switch (msg.tipo) {
    case 'criarPedido':
      await pedidos.criarPedido(tabId, msg.dados, agora);
      return null;
    case 'obterPedido':
      return pedidos.obterPedido(tabId, sender.url ?? '', agora);
    case 'concluirEtapa':
      return (await pedidos.concluirEtapa(tabId, agora, msg.municipioEmitente)) ? { concluido: true } : null;
    case 'pausar':
      await pedidos.pausar(tabId, agora);
      return null;
    case 'encerrar':
      await pedidos.encerrar(tabId);
      return null;
  }
}
