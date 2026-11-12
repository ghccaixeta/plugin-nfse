// Content script no mundo MAIN: preenche a etapa usando o jQuery da página.
// Não acessa chrome.*; recebe o pedido e responde pela ponte (protocolo.ts).
import { HOST } from '../dominio/etapas';
import { FalhaCampo, criarAcoes, type Acoes } from '../portal/acoes';
import { executarPessoas } from '../portal/etapa-pessoas';
import { executarServico } from '../portal/etapa-servico';
import { executarValores } from '../portal/etapa-valores';
import { descreverRecusa } from '../portal/erros-portal';
import type { PedidoExecucao, ResultadoEtapa } from '../dominio/tipos';
import { EVENTOS, emitir, ouvir } from './protocolo';

/** Caso limite: após Avançar, se a navegação não começar neste prazo, o preenchimento termina com falha. */
const PRAZO_NAVEGACAO_MS = 15_000;
/** Prazo para a ponte confirmar que o SW gravou a etapa antes do Avançar. */
const PRAZO_CONFIRMACAO_MS = 5_000;

const SEM_CONFIRMACAO = 'a extensão não confirmou a etapa; nada foi avançado. Tente de novo.';

interface DepsPreenchedor {
  acoes: Acoes;
  doc?: Document;
}

function executarEtapa(acoes: Acoes, { etapa, dados, municipioEmitente }: PedidoExecucao): Promise<ResultadoEtapa> {
  switch (etapa) {
    case 'pessoas':
      return executarPessoas(acoes, dados);
    case 'servico':
      return executarServico(acoes, dados, municipioEmitente);
    case 'valores':
      return executarValores(acoes, dados);
  }
}

/** Registra o listener e anuncia `nfse:pronto`. Devolve a função que desliga tudo. */
export function iniciarPreenchedor({ acoes, doc = document }: DepsPreenchedor) {
  const timers: ReturnType<typeof setTimeout>[] = [];

  /** Espera o `nfse:continuar` da ponte; `false` se não vier no prazo. */
  function confirmacaoDaPonte(): Promise<boolean> {
    return new Promise((resolve) => {
      const parar = ouvir(doc, EVENTOS.continuar, () => {
        clearTimeout(timer);
        parar();
        resolve(true);
      });
      const timer = setTimeout(() => {
        parar();
        resolve(false);
      }, PRAZO_CONFIRMACAO_MS);
      timers.push(timer);
    });
  }

  /**
   * O content script pode rodar antes de o portal terminar de se montar (handlers
   * do `ready`, Select2/Chosen). Espera o `load` e um ciclo do event loop.
   */
  function paginaPronta(): Promise<void> {
    return new Promise((resolve) => {
      const seguir = () => timers.push(setTimeout(resolve, 0));
      if (doc.readyState === 'complete') return seguir();
      (doc.defaultView ?? window).addEventListener('load', seguir, { once: true });
    });
  }

  async function executar(pedido: PedidoExecucao) {
    const { etapa } = pedido;
    const falhar = (mensagem: string) => emitir(doc, EVENTOS.resultado, { ok: false, etapa, mensagem });
    try {
      await paginaPronta();
      const r = await executarEtapa(acoes, pedido);
      if ('pausa' in r) return emitir(doc, EVENTOS.resultado, { ok: true, ...r });

      // Responde e só avança depois que o SW gravou a etapa: o clique navega e a
      // próxima página pergunta ao SW pela etapa esperada.
      const confirmado = confirmacaoDaPonte();
      emitir(doc, EVENTOS.resultado, { ok: true, ...r });
      if (!(await confirmado)) return falhar(SEM_CONFIRMACAO);

      // Se a navegação não começar no prazo, o portal recusou no próprio navegador
      // (validação client-side). Começou (POST em andamento, mesmo lento) → nada a fazer.
      const janela = doc.defaultView ?? window;
      const prazo = setTimeout(() => falhar(descreverRecusa(doc)), PRAZO_NAVEGACAO_MS);
      timers.push(prazo);
      janela.addEventListener('beforeunload', () => clearTimeout(prazo), { once: true });
      await acoes.clicarAvancar();
    } catch (erro) {
      falhar(erro instanceof FalhaCampo ? erro.message : `Erro inesperado: ${String(erro)}`);
    }
  }

  const desligar = [
    ouvir(doc, EVENTOS.executar, (pedido) => void executar(pedido)),
    ouvir(doc, EVENTOS.ping, () => emitir(doc, EVENTOS.pronto, {})),
  ];
  emitir(doc, EVENTOS.pronto, {});

  return () => {
    for (const d of desligar) d();
    for (const t of timers) clearTimeout(t);
  };
}

if (location.hostname === HOST) {
  iniciarPreenchedor({ acoes: criarAcoes() });
}
