// Primitivas de interação com o formulário do portal. Rodam no mundo MAIN
// (content script `preenchedor`), onde o jQuery da página está disponível:
// Chosen e Select2 só reagem pelo jQuery/eventos que eles mesmos escutam.
import { CHOSEN, SELECT2, encontrarAvancar, type Campo } from './seletores';

/** Falha de preenchimento identificando o campo (NFSE-08). */
export class FalhaCampo extends Error {
  constructor(
    readonly campo: string,
    motivo = 'não encontrado',
  ) {
    super(`${campo} ${motivo}`);
    this.name = 'FalhaCampo';
  }
}

/** Subconjunto do jQuery da página usado aqui. */
export interface ObjetoJQuery {
  val(valor: string): ObjetoJQuery;
  trigger(evento: string): ObjetoJQuery;
  select2?(comando: 'open' | 'close'): ObjetoJQuery;
}
export type JQueryMinimo = (el: Element) => ObjetoJQuery;

export type Condicao = 'presente' | 'habilitado' | 'preenchido';

export type CriterioOpcao = { exato: string } | { prefixo: string };

/** Contrato usado pelas etapas; substituído por um fake nos testes delas. */
export interface Acoes {
  esperar(campo: Campo, condicao?: Condicao): Promise<HTMLElement>;
  marcarRadio(campo: Campo): Promise<void>;
  selecionarChosen(campo: Campo, valor: string): Promise<void>;
  selecionarSelect2Ajax(campo: Campo, termo: string, criterio: CriterioOpcao): Promise<void>;
  digitarMascarado(campo: Campo, texto: string): Promise<void>;
  preencherTexto(campo: Campo, texto: string): Promise<void>;
  clicar(campo: Campo): Promise<void>;
  clicarAvancar(): Promise<void>;
  lerValor(campo: Campo): string;
}

export interface OpcoesAcoes {
  doc?: Document;
  /** Padrão: `window.jQuery` da página. */
  jq?: JQueryMinimo;
  /** NFSE-08: 15 s por campo. */
  timeoutMs?: number;
  intervaloMs?: number;
}

type CampoDeFormulario = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const MOTIVO: Record<Condicao, string> = {
  presente: 'não encontrado',
  habilitado: 'não habilitou',
  preenchido: 'não encontrado',
};

const normalizar = (texto: string) => texto.trim().toLocaleUpperCase('pt-BR');

/** Função que diz se o texto de uma opção atende ao critério (normaliza o alvo uma vez). */
function casador(criterio: CriterioOpcao): (texto: string) => boolean {
  if ('prefixo' in criterio) return (texto) => texto.trim().startsWith(criterio.prefixo);
  const alvo = normalizar(criterio.exato);
  return (texto) => normalizar(texto) === alvo;
}

function disparar(el: Element, ...tipos: string[]): void {
  for (const tipo of tipos) el.dispatchEvent(new Event(tipo, { bubbles: true }));
}

/** Cede o event loop: a máscara do portal (VMasker) formata num setTimeout após o keyup. */
const ceder = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const FOCO = {
  entrar: { metodo: 'focus', evento: 'focus', propagado: 'focusin' },
  sair: { metodo: 'blur', evento: 'blur', propagado: 'focusout' },
} as const;

/**
 * Entra/sai do campo como o usuário (o portal consulta o CNPJ no `focusout`;
 * seu jQuery 3.3.1 deriva o `focusout` do `blur`). Com o documento sem foco —
 * clique vindo do painel lateral — o Chrome move o foco mas não dispara os
 * eventos; então, se o evento real não veio, dispara o sintético.
 */
function mudarFoco(el: HTMLElement, direcao: keyof typeof FOCO): void {
  const { metodo, evento, propagado } = FOCO[direcao];
  let disparou = false;
  const marcar = () => (disparou = true);
  el.addEventListener(evento, marcar);
  el[metodo]();
  el.removeEventListener(evento, marcar);
  if (disparou) return;
  el.dispatchEvent(new FocusEvent(evento));
  el.dispatchEvent(new FocusEvent(propagado, { bubbles: true }));
}

function teclar(el: Element, tipo: 'keydown' | 'keypress' | 'keyup', tecla: string): void {
  el.dispatchEvent(new KeyboardEvent(tipo, { key: tecla, bubbles: true, cancelable: true }));
}

export function criarAcoes({
  doc = document,
  jq,
  timeoutMs = 15_000,
  intervaloMs = 100,
}: OpcoesAcoes = {}): Acoes {
  const jQuery = (el: Element): ObjetoJQuery => {
    const $ = jq ?? (globalThis as { jQuery?: JQueryMinimo }).jQuery;
    if (!$) throw new Error('jQuery da página não encontrado');
    return $(el);
  };

  /** Repete `obter` até devolver algo ou estourar o tempo (→ FalhaCampo). */
  function aguardar<T>(obter: () => T | null | undefined, campo: Pick<Campo, 'nome'>, motivo?: string) {
    const tentativas = Math.ceil(timeoutMs / intervaloMs);
    return new Promise<T>((resolve, reject) => {
      const tentar = (restantes: number) => {
        const valor = obter();
        if (valor) return resolve(valor);
        if (restantes <= 0) return reject(new FalhaCampo(campo.nome, motivo));
        setTimeout(() => tentar(restantes - 1), intervaloMs);
      };
      tentar(tentativas);
    });
  }

  function esperar(campo: Campo, condicao: Condicao = 'presente'): Promise<HTMLElement> {
    return aguardar(
      () => {
        const el = doc.querySelector<HTMLElement>(campo.css);
        if (!el) return null;
        if (condicao === 'habilitado' && (el as CampoDeFormulario).disabled) return null;
        if (condicao === 'preenchido' && !(el as CampoDeFormulario).value?.trim()) return null;
        return el;
      },
      campo,
      MOTIVO[condicao],
    );
  }

  const esperarCampo = (campo: Campo) => esperar(campo, 'habilitado') as Promise<CampoDeFormulario>;

  return {
    esperar,

    async marcarRadio(campo) {
      const radio = (await esperarCampo(campo)) as HTMLInputElement;
      // O input do portal é invisível; o usuário clica no label.
      (radio.closest('label') ?? radio).click();
      if (!radio.checked) throw new FalhaCampo(campo.nome, 'não marcado');
    },

    async selecionarChosen(campo, valor) {
      const select = (await esperarCampo(campo)) as HTMLSelectElement;
      // Antes de o portal inicializar o Chosen, o trigger não chega a ninguém.
      await aguardar(() => doc.getElementById(select.id + CHOSEN.sufixoContainer), campo, 'não carregou');
      // jQuery val() com opção inexistente não reclama; conferir antes e depois.
      if (![...select.options].some((o) => o.value === valor)) throw new FalhaCampo(campo.nome);
      jQuery(select).val(valor).trigger('chosen:updated').trigger('change');
      if (select.value !== valor) throw new FalhaCampo(campo.nome, 'não aplicado');
    },

    async selecionarSelect2Ajax(campo, termo, criterio) {
      const select = (await esperarCampo(campo)) as HTMLSelectElement;
      await aguardar(() => select.classList.contains(SELECT2.classeInicializado), campo, 'não carregou');
      const atende = casador(criterio);
      const $select = jQuery(select);
      $select.select2?.('open');
      try {
        const busca = await aguardar(() => doc.querySelector<HTMLInputElement>(SELECT2.campoBusca), campo);
        busca.value = termo;
        disparar(busca, 'input', 'keyup');

        const opcao = await aguardar(
          () =>
            [...doc.querySelectorAll<HTMLElement>(SELECT2.opcao)].find(
              (li) => !li.classList.contains(SELECT2.classeCarregando) && atende(li.textContent ?? ''),
            ),
          campo,
        );
        // Select2 v4 seleciona no mouseup da opção.
        for (const tipo of ['mousedown', 'mouseup', 'click']) {
          opcao.dispatchEvent(new MouseEvent(tipo, { bubbles: true, cancelable: true }));
        }
      } catch (erro) {
        $select.select2?.('close');
        throw erro;
      }
      const escolhida = select.selectedOptions[0]?.textContent ?? '';
      if (!select.value || !atende(escolhida)) throw new FalhaCampo(campo.nome, 'não aplicado');
    },

    async digitarMascarado(campo, texto) {
      const el = await esperarCampo(campo);
      mudarFoco(el, 'entrar');
      el.value = ''; // o portal lembra valores anteriores (ex.: alíquota)
      for (const tecla of texto) {
        teclar(el, 'keydown', tecla);
        teclar(el, 'keypress', tecla);
        el.value += tecla;
        disparar(el, 'input');
        teclar(el, 'keyup', tecla);
        await ceder();
      }
      // O change do portal valida o valor já mascarado (ex.: data dd/mm/aaaa).
      disparar(el, 'change');
      // Equivale ao Tab: dispara a lógica do portal (ex.: consulta do CNPJ no focusout).
      mudarFoco(el, 'sair');
    },

    async preencherTexto(campo, texto) {
      const el = await esperarCampo(campo);
      mudarFoco(el, 'entrar');
      el.value = texto;
      disparar(el, 'input', 'change');
      mudarFoco(el, 'sair');
    },

    async clicar(campo) {
      (await esperarCampo(campo)).click();
    },

    async clicarAvancar() {
      (await aguardar(() => encontrarAvancar(doc), { nome: 'Avançar' })).click();
    },

    lerValor(campo) {
      return doc.querySelector<CampoDeFormulario>(campo.css)?.value ?? '';
    },
  };
}
