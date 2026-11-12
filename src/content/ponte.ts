// Content script no mundo isolado: conversa com o service worker (chrome.*) e
// com o preenchedor no mundo MAIN (CustomEvent), e mostra os avisos.
import type { MensagemSW, RespostaPedido } from '../background/pedidos';
import { HOST, NOME_ETAPA, avisoDaEtapa } from '../dominio/etapas';
import type { Etapa, PedidoExecucao } from '../dominio/tipos';
import { descreverRecusa } from '../portal/erros-portal';
import { mostrarBanner } from './banner';
import { EVENTOS, emitir, ouvir, type ResultadoExecucao } from './protocolo';

const TEXTOS = {
  sucesso: 'Preenchido. Confira os dados e clique em Emitir NFS-e.', // NFSE-07
  pausa: 'Selecione o Código Complementar Municipal e clique em Avançar para continuar', // NFSE-09
  naoRegistrou: 'a extensão não conseguiu registrar a etapa; nada foi avançado. Tente de novo.',
  inesperada: 'página diferente da esperada. Preenchimento cancelado.',
} as const;

export function iniciarPonte({ enviar, doc = document }: { enviar(msg: MensagemSW): Promise<RespostaPedido>; doc?: Document }) {
  let preenchedorPronto = false;
  let pendente: PedidoExecucao | null = null;
  /** Etapa em execução nesta página; null quando nada foi pedido (ignora eventos forjados). */
  let emExecucao: Etapa | null = null;

  const despachar = () => {
    if (!preenchedorPronto || !pendente) return;
    emitir(doc, EVENTOS.executar, pendente);
    pendente = null;
  };

  /** Termina a execução nesta página: aviso + estado no SW (encerrar ou pausar). */
  const terminar = (tipo: 'erro' | 'aviso', texto: string, msg: MensagemSW) => {
    emExecucao = null;
    mostrarBanner(doc, tipo, texto);
    void enviar(msg);
  };

  function tratarResultado(r: ResultadoExecucao) {
    const etapa = emExecucao;
    if (!etapa) return;
    if (!r.ok) return terminar('erro', avisoDaEtapa(r.etapa, r.mensagem), { tipo: 'encerrar' });
    if ('pausa' in r) return terminar('aviso', TEXTOS.pausa, { tipo: 'pausar' });
    // Continua "em execução": ainda pode chegar falha após o Avançar. O preenchedor só
    // clica com esta confirmação, que só vai quando o SW gravou a próxima etapa.
    void enviar({ tipo: 'concluirEtapa', municipioEmitente: r.municipioEmitente }).then((resposta) =>
      resposta && 'concluido' in resposta
        ? emitir(doc, EVENTOS.continuar, {})
        : terminar('erro', avisoDaEtapa(etapa, TEXTOS.naoRegistrou), { tipo: 'encerrar' }),
    );
  }

  const desligar = [
    ouvir(doc, EVENTOS.pronto, () => {
      preenchedorPronto = true;
      despachar();
    }),
    ouvir(doc, EVENTOS.resultado, tratarResultado),
  ];
  emitir(doc, EVENTOS.ping, {});

  return {
    /** Remove os listeners do documento. */
    desligar(): void {
      for (const d of desligar) d();
    },

    /** Ao carregar a página e quando o painel manda `iniciar`. */
    async verificar(): Promise<void> {
      if (emExecucao) return;
      const resposta = await enviar({ tipo: 'obterPedido' });
      if (!resposta || 'concluido' in resposta) return;

      if ('conferencia' in resposta) {
        mostrarBanner(doc, 'sucesso', TEXTOS.sucesso);
      } else if ('erro' in resposta) {
        const texto = resposta.erro === 'recusadoPeloPortal' ? descreverRecusa(doc) : TEXTOS.inesperada;
        mostrarBanner(doc, 'erro', resposta.etapa ? avisoDaEtapa(resposta.etapa, texto) : texto);
      } else {
        emExecucao = resposta.executar.etapa;
        mostrarBanner(doc, 'info', `Preenchendo a etapa ${NOME_ETAPA[resposta.executar.etapa]}…`);
        pendente = resposta.executar;
        despachar();
      }
    },
  };
}

if (location.hostname === HOST && typeof chrome !== 'undefined' && chrome.runtime?.id) {
  const ponte = iniciarPonte({ enviar: (msg) => chrome.runtime.sendMessage(msg) });
  chrome.runtime.onMessage.addListener((msg: { tipo?: string }, _sender, responder) => {
    if (msg?.tipo !== 'iniciar') return false;
    ponte.verificar().then(
      () => responder(true),
      () => responder(false),
    );
    return true;
  });
  void ponte.verificar();
}
