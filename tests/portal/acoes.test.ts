// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FalhaCampo, criarAcoes, type JQueryMinimo, type ObjetoJQuery } from '../../src/portal/acoes';
import type { Campo } from '../../src/portal/seletores';

const TIMEOUT = 15_000;
const campo = (css: string, nome = 'Campo X'): Campo => ({ css, nome });

/** Espera a promessa rejeitar (avançando os timers falsos) e devolve o erro. */
async function falhaDe(promessa: Promise<unknown>, avancarMs = TIMEOUT + 100): Promise<FalhaCampo> {
  const capturada = promessa.then(
    () => {
      throw new Error('esperava FalhaCampo');
    },
    (e: unknown) => e,
  );
  await vi.advanceTimersByTimeAsync(avancarMs);
  const erro = await capturada;
  expect(erro).toBeInstanceOf(FalhaCampo);
  return erro as FalhaCampo;
}

/** jQuery falso mínimo: val/trigger sobre o elemento, registrando os triggers. */
function jQueryFalso(opcoes: { ignorarVal?: boolean; select2?: (el: HTMLElement) => void } = {}) {
  const triggers: string[] = [];
  const jq: JQueryMinimo = (el) => {
    const alvo = el as HTMLInputElement;
    const api: ObjetoJQuery = {
      val(v) {
        if (!opcoes.ignorarVal) alvo.value = v;
        return api;
      },
      trigger(evento: string) {
        triggers.push(evento);
        return api;
      },
      select2(comando: 'open' | 'close') {
        if (comando === 'open') opcoes.select2?.(alvo);
        return api;
      },
    };
    return api;
  };
  return { jq, triggers };
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('esperar (NFSE-08)', () => {
  it('resolve quando o elemento aparece', async () => {
    const acoes = criarAcoes({ jq: jQueryFalso().jq });
    const promessa = acoes.esperar(campo('#alvo'));
    setTimeout(() => (document.body.innerHTML = '<input id="alvo">'), 500);
    await vi.advanceTimersByTimeAsync(600);
    await expect(promessa).resolves.toBe(document.querySelector('#alvo'));
  });

  it('com "habilitado" espera o campo deixar de estar disabled', async () => {
    document.body.innerHTML = '<input id="alvo" disabled>';
    const acoes = criarAcoes({ jq: jQueryFalso().jq });
    let resolvida = false;
    const promessa = acoes.esperar(campo('#alvo'), 'habilitado').then(() => (resolvida = true));
    await vi.advanceTimersByTimeAsync(1000);
    expect(resolvida).toBe(false);
    document.querySelector<HTMLInputElement>('#alvo')!.disabled = false;
    await vi.advanceTimersByTimeAsync(200);
    await promessa;
    expect(resolvida).toBe(true);
  });

  it('com "preenchido" espera o campo ter valor', async () => {
    document.body.innerHTML = '<input id="nome" readonly>';
    const acoes = criarAcoes({ jq: jQueryFalso().jq });
    const promessa = acoes.esperar(campo('#nome'), 'preenchido');
    setTimeout(() => (document.querySelector<HTMLInputElement>('#nome')!.value = 'TOMADOR'), 3000);
    await vi.advanceTimersByTimeAsync(3200);
    await expect(promessa).resolves.toBeTruthy();
  });

  it('NFSE-08 lança FalhaCampo com o nome do campo após 15 s', async () => {
    const acoes = criarAcoes({ jq: jQueryFalso().jq });
    const erro = await falhaDe(acoes.esperar(campo('#nunca', 'Nome do tomador')));
    expect(erro.campo).toBe('Nome do tomador');
    expect(erro.message).toBe('Nome do tomador não encontrado');
  });

  it('NFSE-08 não falha antes dos 15 s', async () => {
    const acoes = criarAcoes({ jq: jQueryFalso().jq });
    let terminou = false;
    acoes.esperar(campo('#nunca')).catch(() => (terminou = true));
    await vi.advanceTimersByTimeAsync(TIMEOUT - 200);
    expect(terminou).toBe(false);
    await vi.advanceTimersByTimeAsync(400);
    expect(terminou).toBe(true);
  });
});

describe('marcarRadio', () => {
  it('clica no label (o input do portal é invisível) e deixa o radio marcado', async () => {
    document.body.innerHTML = `
      <label><input type="radio" name="r" value="1" checked>Sim<span class="cr"></span></label>
      <label id="lbl"><input type="radio" name="r" value="0">Não<span class="cr"></span></label>`;
    const cliques: string[] = [];
    // O clique no label gera um clique no input, que sobe de volta ao label; conta só o primeiro.
    const label = document.querySelector('#lbl')!;
    label.addEventListener('click', (e) => e.target === label && cliques.push('label'));
    const acoes = criarAcoes({ jq: jQueryFalso().jq });
    await acoes.marcarRadio(campo('input[name="r"][value="0"]'));
    expect(cliques).toEqual(['label']);
    expect(document.querySelector<HTMLInputElement>('input[value="0"]')!.checked).toBe(true);
  });

  it('NFSE-08 radio desabilitado até o timeout → FalhaCampo', async () => {
    document.body.innerHTML = '<label><input type="radio" name="r" value="0" disabled>Não</label>';
    const acoes = criarAcoes({ jq: jQueryFalso().jq });
    const erro = await falhaDe(acoes.marcarRadio(campo('input[name="r"]', 'Retenção do ISSQN')));
    expect(erro.campo).toBe('Retenção do ISSQN');
  });
});

describe('selecionarChosen', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <select id="sel" style="display:none">
        <option value="">Selecione</option>
        <option value="1">Regime 1</option>
        <option value="2">Regime 2</option>
      </select>
      <div id="sel_chosen" class="chosen-container"></div>`;
  });

  it('espera o portal inicializar o Chosen do campo (#<id>_chosen) antes de aplicar', async () => {
    document.querySelector('#sel_chosen')!.remove();
    const { jq, triggers } = jQueryFalso();
    const promessa = criarAcoes({ jq }).selecionarChosen(campo('#sel'), '2');
    await vi.advanceTimersByTimeAsync(1000);
    expect(triggers).toEqual([]);
    document.body.insertAdjacentHTML('beforeend', '<div id="sel_chosen" class="chosen-container"></div>');
    await vi.advanceTimersByTimeAsync(200);
    await promessa;
    expect(triggers).toEqual(['chosen:updated', 'change']);
  });

  it('NFSE-08 Chosen nunca inicializado → FalhaCampo "não carregou"', async () => {
    document.querySelector('#sel_chosen')!.remove();
    const erro = await falhaDe(criarAcoes({ jq: jQueryFalso().jq }).selecionarChosen(campo('#sel', 'NBS'), '1'));
    expect(erro.message).toBe('NBS não carregou');
  });

  it('aplica o valor e dispara chosen:updated e change', async () => {
    const { jq, triggers } = jQueryFalso();
    await criarAcoes({ jq }).selecionarChosen(campo('#sel'), '2');
    expect(document.querySelector<HTMLSelectElement>('#sel')!.value).toBe('2');
    expect(triggers).toEqual(['chosen:updated', 'change']);
  });

  it('NFSE-08 opção inexistente → FalhaCampo (jQuery val() falharia em silêncio)', async () => {
    const { jq, triggers } = jQueryFalso();
    const erro = await falhaDe(criarAcoes({ jq }).selecionarChosen(campo('#sel', 'NBS'), '999999999'), 0);
    expect(erro.message).toBe('NBS não encontrado');
    expect(triggers).toEqual([]);
  });

  it('NFSE-08 valor não aplicado → FalhaCampo', async () => {
    const { jq } = jQueryFalso({ ignorarVal: true });
    const erro = await falhaDe(criarAcoes({ jq }).selecionarChosen(campo('#sel', 'Regime'), '1'), 0);
    expect(erro.campo).toBe('Regime');
  });
});

describe('digitarMascarado (caso limite: sobrescrever)', () => {
  it('limpa o valor anterior e digita caractere a caractere, terminando com change e blur', async () => {
    document.body.innerHTML = '<input id="aliq" value="5,00">';
    const el = document.querySelector<HTMLInputElement>('#aliq')!;
    const eventos: string[] = [];
    for (const tipo of ['keydown', 'keypress', 'input', 'keyup', 'change', 'blur']) {
      el.addEventListener(tipo, () => eventos.push(`${tipo}:${el.value}`));
    }
    const promessa = criarAcoes({ jq: jQueryFalso().jq }).digitarMascarado(campo('#aliq'), '201');
    await vi.advanceTimersByTimeAsync(100);
    await promessa;
    expect(el.value).toBe('201');
    expect(eventos.filter((e) => e.startsWith('keyup'))).toEqual(['keyup:2', 'keyup:20', 'keyup:201']);
    expect(eventos.slice(-2)).toEqual(['change:201', 'blur:201']);
  });

  it('funciona com uma máscara que reformata a cada keyup', async () => {
    document.body.innerHTML = '<input id="valor" value="99,99">';
    const el = document.querySelector<HTMLInputElement>('#valor')!;
    // Máscara de moeda simplificada, como a do portal: dígitos → centavos.
    el.addEventListener('keyup', () => {
      const d = el.value.replace(/\D/g, '').replace(/^0+/, '').padStart(3, '0');
      el.value = `${d.slice(0, -2)},${d.slice(-2)}`;
    });
    const promessa = criarAcoes({ jq: jQueryFalso().jq }).digitarMascarado(campo('#valor'), '1000');
    await vi.advanceTimersByTimeAsync(100);
    await promessa;
    expect(el.value).toBe('10,00');
  });

  it('espera a máscara assíncrona (VMasker formata num setTimeout após o keyup) antes do change', async () => {
    document.body.innerHTML = '<input id="data">';
    const el = document.querySelector<HTMLInputElement>('#data')!;
    el.addEventListener('keyup', () => {
      setTimeout(() => {
        const d = el.value.replace(/\D/g, '').slice(0, 8);
        el.value = [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/');
      }, 0);
    });
    let valorNoChange = '';
    el.addEventListener('change', () => (valorNoChange = el.value));
    const promessa = criarAcoes({ jq: jQueryFalso().jq }).digitarMascarado(campo('#data'), '09112026');
    await vi.advanceTimersByTimeAsync(100);
    await promessa;
    expect(el.value).toBe('09/11/2026');
    expect(valorNoChange).toBe('09/11/2026');
  });

  it('página sem foco (clique veio do painel lateral): dispara focusout mesmo assim, uma vez só', async () => {
    // Chrome sem foco no documento: focus()/blur() não disparam eventos.
    document.body.innerHTML = '<input id="cnpj">';
    const el = document.querySelector<HTMLInputElement>('#cnpj')!;
    vi.spyOn(el, 'focus').mockImplementation(() => {});
    vi.spyOn(el, 'blur').mockImplementation(() => {});
    const eventos: string[] = [];
    for (const tipo of ['focus', 'focusin', 'blur', 'focusout']) el.addEventListener(tipo, () => eventos.push(tipo));
    let valorNoFocusout = '';
    document.addEventListener('focusout', () => (valorNoFocusout = el.value)); // o portal escuta com delegação
    const promessa = criarAcoes({ jq: jQueryFalso().jq }).digitarMascarado(campo('#cnpj'), '23');
    await vi.advanceTimersByTimeAsync(100);
    await promessa;
    expect(eventos).toEqual(['focus', 'focusin', 'blur', 'focusout']);
    expect(valorNoFocusout).toBe('23');
  });

  it('página com foco: usa focus()/blur() nativos, sem eventos duplicados', async () => {
    document.body.innerHTML = '<input id="cnpj">';
    const el = document.querySelector<HTMLInputElement>('#cnpj')!;
    const eventos: string[] = [];
    for (const tipo of ['focus', 'focusin', 'blur', 'focusout']) el.addEventListener(tipo, () => eventos.push(tipo));
    const promessa = criarAcoes({ jq: jQueryFalso().jq }).digitarMascarado(campo('#cnpj'), '23');
    await vi.advanceTimersByTimeAsync(100);
    await promessa;
    expect(eventos).toEqual(['focus', 'focusin', 'blur', 'focusout']);
  });

  it('NFSE-08 campo desabilitado até o timeout → FalhaCampo', async () => {
    document.body.innerHTML = '<input id="x" disabled>';
    const erro = await falhaDe(criarAcoes({ jq: jQueryFalso().jq }).digitarMascarado(campo('#x', 'Valor'), '1'));
    expect(erro.campo).toBe('Valor');
  });
});

describe('preencherTexto', () => {
  it('sobrescreve e dispara input e change', async () => {
    document.body.innerHTML = '<textarea id="d">antigo</textarea>';
    const el = document.querySelector<HTMLTextAreaElement>('#d')!;
    const eventos: string[] = [];
    el.addEventListener('input', () => eventos.push('input'));
    el.addEventListener('change', () => eventos.push('change'));
    await criarAcoes({ jq: jQueryFalso().jq }).preencherTexto(campo('#d'), 'novo');
    expect(el.value).toBe('novo');
    expect(eventos).toEqual(['input', 'change']);
  });
});

describe('preencherTexto sem foco no documento', () => {
  it('dispara focus/focusin antes e blur/focusout depois, mesmo sem eventos nativos', async () => {
    document.body.innerHTML = '<input id="email">';
    const el = document.querySelector<HTMLInputElement>('#email')!;
    vi.spyOn(el, 'focus').mockImplementation(() => {});
    vi.spyOn(el, 'blur').mockImplementation(() => {});
    const eventos: string[] = [];
    for (const tipo of ['focus', 'focusin', 'input', 'change', 'blur', 'focusout']) {
      el.addEventListener(tipo, () => eventos.push(tipo));
    }
    await criarAcoes({ jq: jQueryFalso().jq }).preencherTexto(campo('#email'), 'a@b.com');
    expect(eventos).toEqual(['focus', 'focusin', 'input', 'change', 'blur', 'focusout']);
  });
});

describe('selecionarSelect2Ajax (NFSE-05, casos limite)', () => {
  /**
   * Select2 falso: ao abrir cria o container com o campo de busca; ao digitar,
   * "busca no servidor" (300 ms) e lista as opções; mouseup numa opção a
   * seleciona no <select>, como o Select2 v4.
   */
  function montarSelect2(resultados: Record<string, string[]>) {
    // Select2 já inicializado pelo portal (ele marca o <select> com esta classe).
    document.body.innerHTML = '<select id="mun" class="select2-hidden-accessible"></select>';
    const select = document.querySelector<HTMLSelectElement>('#mun')!;
    const termosBuscados: string[] = [];
    const abrir = () => {
      document.querySelector('.select2-container--open')?.remove();
      const container = document.createElement('span');
      container.className = 'select2-container select2-container--open';
      container.innerHTML = '<input class="select2-search__field"><ul class="select2-results__options"></ul>';
      document.body.append(container);
      const busca = container.querySelector<HTMLInputElement>('.select2-search__field')!;
      const lista = container.querySelector('ul')!;
      busca.addEventListener('input', () => {
        termosBuscados.push(busca.value);
        lista.innerHTML = '<li class="select2-results__option loading-results">Buscando…</li>';
        const termo = busca.value;
        setTimeout(() => {
          lista.innerHTML = '';
          for (const [i, texto] of (resultados[termo] ?? []).entries()) {
            const li = document.createElement('li');
            li.className = 'select2-results__option';
            li.textContent = texto;
            li.addEventListener('mouseup', () => {
              select.innerHTML = `<option value="${i + 1}" selected>${texto}</option>`;
              container.remove();
            });
            lista.append(li);
          }
        }, 300);
      });
    };
    return { select, abrir, termosBuscados };
  }

  it('espera o portal inicializar o Select2 no campo antes de abrir', async () => {
    const s2 = montarSelect2({ Goianésia: ['Goianésia/GO'] });
    s2.select.classList.remove('select2-hidden-accessible');
    const aberturas: number[] = [];
    const { jq } = jQueryFalso({ select2: () => { aberturas.push(Date.now()); s2.abrir(); } });
    const promessa = criarAcoes({ jq }).selecionarSelect2Ajax(campo('#mun'), 'Goianésia', { exato: 'Goianésia/GO' });
    await vi.advanceTimersByTimeAsync(1000);
    expect(aberturas).toEqual([]);
    s2.select.classList.add('select2-hidden-accessible');
    await vi.advanceTimersByTimeAsync(1000);
    await promessa;
    expect(aberturas).toHaveLength(1);
  });

  it('NFSE-08 Select2 nunca inicializado → FalhaCampo com o nome do campo', async () => {
    const s2 = montarSelect2({});
    s2.select.classList.remove('select2-hidden-accessible');
    const { jq } = jQueryFalso({ select2: s2.abrir });
    const erro = await falhaDe(
      criarAcoes({ jq }).selecionarSelect2Ajax(campo('#mun', 'Município da prestação'), 'X', { exato: 'X/GO' }),
    );
    expect(erro.message).toBe('Município da prestação não carregou');
  });

  it('NFSE-05 escolhe o texto exato, não a correspondência parcial', async () => {
    const s2 = montarSelect2({ Goianésia: ['Goianésia do Pará/PA', 'Goianésia/GO'] });
    const { jq } = jQueryFalso({ select2: s2.abrir });
    const promessa = criarAcoes({ jq }).selecionarSelect2Ajax(campo('#mun'), 'Goianésia', {
      exato: 'Goianésia/GO',
    });
    await vi.advanceTimersByTimeAsync(1000);
    await promessa;
    expect(s2.termosBuscados).toEqual(['Goianésia']);
    expect(s2.select.selectedOptions[0]?.textContent).toBe('Goianésia/GO');
  });

  it('NFSE-05 texto exato não diferencia maiúsculas, mas diferencia acentos', async () => {
    const s2 = montarSelect2({ goianesia: ['Goianesia/GO'], Goianésia: ['GOIANÉSIA/GO'] });
    const { jq } = jQueryFalso({ select2: s2.abrir });
    const promessa = criarAcoes({ jq }).selecionarSelect2Ajax(campo('#mun'), 'Goianésia', {
      exato: 'goianésia/GO',
    });
    await vi.advanceTimersByTimeAsync(1000);
    await promessa;
    expect(s2.select.selectedOptions[0]?.textContent).toBe('GOIANÉSIA/GO');
  });

  it('NFSE-05 escolhe por prefixo (código de tributação)', async () => {
    const s2 = montarSelect2({
      '010101': ['01.01.01 - Análise e desenvolvimento de sistemas.'],
    });
    const { jq } = jQueryFalso({ select2: s2.abrir });
    const promessa = criarAcoes({ jq }).selecionarSelect2Ajax(campo('#mun'), '010101', {
      prefixo: '01.01.01 - ',
    });
    await vi.advanceTimersByTimeAsync(1000);
    await promessa;
    expect(s2.select.selectedOptions[0]?.textContent).toMatch(/^01\.01\.01 - /);
  });

  it('caso limite: nenhuma correspondência exata → FalhaCampo com o nome do campo', async () => {
    const s2 = montarSelect2({ Goianésia: ['Goianésia do Pará/PA'] });
    const { jq } = jQueryFalso({ select2: s2.abrir });
    const erro = await falhaDe(
      criarAcoes({ jq }).selecionarSelect2Ajax(campo('#mun', 'Município da prestação'), 'Goianésia', {
        exato: 'Goianésia/GO',
      }),
    );
    expect(erro.message).toBe('Município da prestação não encontrado');
    expect(s2.select.value).toBe('');
  });

  it('caso limite: busca sem resultado → FalhaCampo', async () => {
    const s2 = montarSelect2({});
    const { jq } = jQueryFalso({ select2: s2.abrir });
    const erro = await falhaDe(
      criarAcoes({ jq }).selecionarSelect2Ajax(campo('#mun', 'Código de tributação'), '999999', {
        prefixo: '99.99.99 - ',
      }),
    );
    expect(erro.campo).toBe('Código de tributação');
  });
});

describe('clicar e clicarAvancar', () => {
  it('clicar espera habilitar e clica', async () => {
    document.body.innerHTML = '<button id="b" disabled>Buscar</button>';
    const b = document.querySelector<HTMLButtonElement>('#b')!;
    const clique = vi.fn();
    b.addEventListener('click', clique);
    const promessa = criarAcoes({ jq: jQueryFalso().jq }).clicar(campo('#b'));
    setTimeout(() => (b.disabled = false), 500);
    await vi.advanceTimersByTimeAsync(700);
    await promessa;
    expect(clique).toHaveBeenCalledOnce();
  });

  it('clicarAvancar clica no botão Avançar da etapa', async () => {
    document.body.innerHTML = '<button class="btn btn-primary">Voltar</button><button class="btn btn-primary"> Avançar </button>';
    const clique = vi.fn();
    document.querySelectorAll('button')[1]!.addEventListener('click', clique);
    await criarAcoes({ jq: jQueryFalso().jq }).clicarAvancar();
    expect(clique).toHaveBeenCalledOnce();
  });

  it('NFSE-07 nunca clica em #btnProsseguir: sem Avançar → FalhaCampo', async () => {
    document.body.innerHTML = '<button id="btnProsseguir" class="btn btn-primary">Emitir NFS-e</button>';
    const clique = vi.fn();
    document.querySelector('#btnProsseguir')!.addEventListener('click', clique);
    const erro = await falhaDe(criarAcoes({ jq: jQueryFalso().jq }).clicarAvancar());
    expect(erro.campo).toBe('Avançar');
    expect(clique).not.toHaveBeenCalled();
  });
});

describe('lerValor', () => {
  it('lê o valor ou devolve vazio se o campo não existe', () => {
    document.body.innerHTML = '<input type="hidden" id="m" value="Goianésia/GO">';
    const acoes = criarAcoes({ jq: jQueryFalso().jq });
    expect(acoes.lerValor(campo('#m'))).toBe('Goianésia/GO');
    expect(acoes.lerValor(campo('#nada'))).toBe('');
  });
});
