// Aviso na página do portal, em shadow DOM para não herdar nem vazar CSS.
export const ID_BANNER = 'nfse-preenchedor-banner';

export type TipoBanner = 'sucesso' | 'erro' | 'aviso' | 'info';

const CORES: Record<TipoBanner, [fundo: string, borda: string]> = {
  sucesso: ['#e8f5e9', '#2e7d32'],
  erro: ['#fdecea', '#c62828'],
  aviso: ['#fff8e1', '#f9a825'],
  info: ['#e3f2fd', '#1565c0'],
};

/** Mostra um aviso no topo da página, substituindo o anterior. */
export function mostrarBanner(doc: Document, tipo: TipoBanner, texto: string): void {
  doc.getElementById(ID_BANNER)?.remove();

  const host = doc.createElement('div');
  host.id = ID_BANNER;
  const raiz = host.attachShadow({ mode: 'open' });
  const [fundo, borda] = CORES[tipo];

  const estilo = doc.createElement('style');
  estilo.textContent = `
    .aviso { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 2147483647;
      max-width: min(640px, calc(100vw - 32px)); display: flex; gap: 12px; align-items: flex-start;
      padding: 12px 16px; border-radius: 8px; border-left: 6px solid ${borda}; background: ${fundo};
      color: #1a1a1a; font: 15px/1.4 system-ui, sans-serif; box-shadow: 0 4px 16px rgba(0,0,0,.2); }
    .titulo { font-weight: 600; }
    button { margin-left: auto; border: 0; background: transparent; font-size: 20px; line-height: 1;
      cursor: pointer; color: inherit; }`;

  const caixa = doc.createElement('div');
  caixa.className = 'aviso';
  caixa.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
  const titulo = doc.createElement('span');
  titulo.className = 'titulo';
  titulo.textContent = 'Preenchedor NFS-e: ';
  const mensagem = doc.createElement('span');
  mensagem.textContent = texto;
  const fechar = doc.createElement('button');
  fechar.type = 'button';
  fechar.setAttribute('aria-label', 'Fechar aviso');
  fechar.textContent = '×';
  fechar.addEventListener('click', () => host.remove());

  const corpo = doc.createElement('div');
  corpo.append(titulo, mensagem);
  caixa.append(corpo, fechar);
  raiz.append(estilo, caixa);
  (doc.body ?? doc.documentElement).append(host);
}
