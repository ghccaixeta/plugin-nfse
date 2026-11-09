// Utilidades das páginas da extensão (painel lateral e opções).

export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

/** Mensagem no elemento `#status` (estilo em `estilo/tema.css`); texto vazio esconde. */
export function mostrarStatus(texto: string, tipo: 'erro' | 'ok' | 'info' = 'info'): void {
  const status = $('status');
  status.textContent = texto;
  status.dataset.tipo = tipo;
  status.hidden = !texto;
}
