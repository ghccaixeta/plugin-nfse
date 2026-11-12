// Protocolo entre a ponte (mundo isolado) e o preenchedor (mundo MAIN) via
// CustomEvent no `document`. O `detail` vai sempre como string JSON: objetos
// não atravessam os dois mundos de forma confiável.
import type { Etapa, PedidoExecucao, ResultadoEtapa } from '../dominio/tipos';

export const EVENTOS = {
  executar: 'nfse:executar', // ponte → preenchedor
  resultado: 'nfse:resultado', // preenchedor → ponte
  pronto: 'nfse:pronto', // preenchedor → ponte: listener registrado
  ping: 'nfse:ping', // ponte → preenchedor: "já está aí?"
  continuar: 'nfse:continuar', // ponte → preenchedor: SW gravou a etapa, pode avançar
} as const;

/** Resultado da etapa (o SW decide a próxima) ou a falha com o nome do campo. */
export type ResultadoExecucao = ({ ok: true } & ResultadoEtapa) | { ok: false; etapa: Etapa; mensagem: string };

interface Payloads {
  [EVENTOS.executar]: PedidoExecucao;
  [EVENTOS.resultado]: ResultadoExecucao;
  [EVENTOS.pronto]: Record<string, never>;
  [EVENTOS.ping]: Record<string, never>;
  [EVENTOS.continuar]: Record<string, never>;
}
type Evento = keyof Payloads;

export function emitir<E extends Evento>(alvo: EventTarget, evento: E, payload: Payloads[E]): void {
  alvo.dispatchEvent(new CustomEvent(evento, { detail: JSON.stringify(payload) }));
}

/** Escuta o evento; `detail` que não seja JSON é ignorado. Devolve a função que para de escutar. */
export function ouvir<E extends Evento>(
  alvo: EventTarget,
  evento: E,
  tratar: (payload: Payloads[E]) => void,
): () => void {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<unknown>).detail;
    if (typeof detail !== 'string') return;
    let payload: Payloads[E];
    try {
      payload = JSON.parse(detail) as Payloads[E];
    } catch {
      return;
    }
    tratar(payload);
  };
  alvo.addEventListener(evento, listener);
  return () => alvo.removeEventListener(evento, listener);
}
