// Painel lateral (pasta `popup` por histórico): formulário da nota, modelos,
// padrões e o botão Preencher. Continua aberto entre abas, então acompanha a aba ativa.
import { ApelidoExistente, ErroValidacao, repositorioLocal } from '../armazenamento/repositorio';
import type { MensagemSW } from '../background/pedidos';
import { URL_PESSOAS, etapaDaUrl } from '../dominio/etapas';
import type { Modelo } from '../dominio/tipos';
import type { ErroCampo } from '../dominio/validacao';
import { $, mostrarStatus } from '../ui/pagina';
import {
  CAMPOS,
  aplicarModelo,
  campoDoFormulario,
  formularioDePadroes,
  lerNota,
  modeloDoFormulario,
  padroesDoFormulario,
  type CampoFormulario,
  type Formulario,
} from './formulario';

const repo = repositorioLocal();
let modelos: Modelo[] = [];
let abaAtiva: chrome.tabs.Tab | undefined;

const campo = (c: CampoFormulario) => $<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(c);
const seletorModelo = $<HTMLSelectElement>('modelo');
const camposSoMeEpp = document.querySelectorAll<HTMLElement>('[data-so-me-epp]');

function lerFormulario(): Formulario {
  return Object.fromEntries(CAMPOS.map((c) => [c, campo(c).value])) as unknown as Formulario;
}

function escreverFormulario(form: Formulario): void {
  for (const c of CAMPOS) campo(c).value = form[c];
  mostrarCamposDoEnquadramento();
  marcarErros([]);
}

/** MEI-02: MEI não usa regime nem alíquota do Simples. */
function mostrarCamposDoEnquadramento(): void {
  const mei = campo('enquadramento').value === 'mei';
  for (const el of camposSoMeEpp) el.hidden = mei;
}

/** NFSE-03: marca cada campo inválido; erros sem campo no formulário vão para o status. */
function marcarErros(erros: ErroCampo[]): void {
  for (const c of CAMPOS) {
    campo(c).removeAttribute('aria-invalid');
    document.querySelector(`[data-erro-de="${c}"]`)!.textContent = '';
  }
  const semCampo: string[] = [];
  for (const { campo: nome, mensagem } of erros) {
    const c = campoDoFormulario(nome);
    if (!c) {
      semCampo.push(mensagem);
      continue;
    }
    campo(c).setAttribute('aria-invalid', 'true');
    document.querySelector(`[data-erro-de="${c}"]`)!.textContent = mensagem;
  }
  if (erros.length) {
    mostrarStatus(semCampo.join('; ') || 'Corrija os campos marcados.', 'erro');
    const primeiro = erros.map((e) => campoDoFormulario(e.campo)).find(Boolean);
    if (primeiro) campo(primeiro).focus();
  } else {
    mostrarStatus('');
  }
}

/**
 * Pergunta no próprio painel (<dialog>), sem depender de prompt()/confirm(),
 * que não são garantidos no painel lateral. Com `entrada`, pede um texto.
 * Devolve o texto (ou '' sem entrada) ao confirmar; `null` ao cancelar/Esc.
 */
function perguntar(texto: string, { rotuloOk = 'OK', entrada }: { rotuloOk?: string; entrada?: string } = {}) {
  const dialogo = $<HTMLDialogElement>('pergunta');
  const campoEntrada = $<HTMLInputElement>('perguntaEntrada');
  $('perguntaTexto').textContent = texto;
  $('perguntaOk').textContent = rotuloOk;
  campoEntrada.hidden = entrada === undefined;
  campoEntrada.value = entrada ?? '';
  dialogo.returnValue = '';
  dialogo.showModal();
  if (entrada !== undefined) campoEntrada.select();
  return new Promise<string | null>((resolve) => {
    dialogo.addEventListener('close', () => resolve(dialogo.returnValue === 'ok' ? campoEntrada.value : null), {
      once: true,
    });
  });
}

const confirmar = async (texto: string, rotuloOk: string) => (await perguntar(texto, { rotuloOk })) !== null;

function sucesso(texto: string): void {
  marcarErros([]);
  mostrarStatus(texto, 'ok');
}

/** Erro de validação do repositório marca os campos; o resto vai para o status. */
function tratarErro(erro: unknown): void {
  if (erro instanceof ErroValidacao) marcarErros(erro.erros);
  else mostrarStatus(String(erro), 'erro');
}

function atualizarBotoesModelo(): void {
  const temModelo = seletorModelo.value !== '';
  $<HTMLButtonElement>('atualizarModelo').disabled = !temModelo;
  $<HTMLButtonElement>('excluirModelo').disabled = !temModelo;
}

async function recarregarModelos(selecionar = ''): Promise<void> {
  modelos = await repo.listarModelos();
  seletorModelo.replaceChildren(new Option('Sem modelo', ''), ...modelos.map((m) => new Option(m.apelido, m.apelido)));
  seletorModelo.value = modelos.some((m) => m.apelido === selecionar) ? selecionar : '';
  atualizarBotoesModelo();
}

async function salvarComoModelo(): Promise<void> {
  const apelido = (await perguntar('Apelido do modelo:', { rotuloOk: 'Salvar', entrada: seletorModelo.value }))?.trim();
  if (!apelido) return;
  const modelo = modeloDoFormulario(lerFormulario(), apelido);
  try {
    await repo.salvarModelo(modelo, { substituir: false });
  } catch (erro) {
    if (!(erro instanceof ApelidoExistente)) throw erro;
    if (!(await confirmar(`Já existe um modelo "${apelido}". Substituir?`, 'Substituir'))) return; // NFSE-14
    await repo.salvarModelo(modelo, { substituir: true });
  }
  await recarregarModelos(apelido);
  sucesso(`Modelo "${apelido}" salvo.`);
}

async function atualizarModelo(): Promise<void> {
  const apelido = seletorModelo.value;
  if (!apelido) return;
  // NFSE-12: só aqui (e em Salvar como modelo) o modelo salvo muda.
  await repo.salvarModelo(modeloDoFormulario(lerFormulario(), apelido), { substituir: true });
  await recarregarModelos(apelido);
  sucesso(`Modelo "${apelido}" atualizado.`);
}

async function excluirModelo(): Promise<void> {
  const apelido = seletorModelo.value;
  if (!apelido || !(await confirmar(`Excluir o modelo "${apelido}"?`, 'Excluir'))) return; // NFSE-13
  await repo.excluirModelo(apelido);
  await recarregarModelos();
  sucesso(`Modelo "${apelido}" excluído.`);
}

async function salvarPadrao(): Promise<void> {
  await repo.salvarPadroes(padroesDoFormulario(lerFormulario())); // NFSE-16
  sucesso('Padrões salvos.');
}

async function escolherModelo(): Promise<void> {
  const modelo = modelos.find((m) => m.apelido === seletorModelo.value);
  const atual = lerFormulario();
  if (modelo) {
    escreverFormulario(aplicarModelo(atual, modelo)); // NFSE-11
  } else {
    const { dataCompetencia, enquadramento, regime, aliquota } = atual;
    escreverFormulario({
      ...formularioDePadroes(await repo.lerPadroes(), new Date()),
      dataCompetencia,
      enquadramento,
      regime,
      aliquota,
    });
  }
  atualizarBotoesModelo();
}

async function preencher(): Promise<void> {
  const leitura = lerNota(lerFormulario());
  if (!leitura.ok) return marcarErros(leitura.erros); // NFSE-03
  // O painel fica aberto entre abas: confirma a aba ativa agora, não a guardada.
  const aba = await abaDaJanela();
  if (aba?.id === undefined || !configurarAba(aba)) {
    return mostrarStatus('Abra a etapa Pessoas da emissão nesta aba para preencher.', 'erro');
  }
  const tabId = aba.id;

  const criar: MensagemSW = { tipo: 'criarPedido', tabId, dados: leitura.nota };
  await chrome.runtime.sendMessage(criar);
  try {
    await chrome.tabs.sendMessage(tabId, { tipo: 'iniciar' });
    mostrarStatus('Preenchendo… acompanhe os avisos na página do portal.', 'ok');
  } catch (erro) {
    // Sem ponte na aba: ela foi aberta antes de instalar/recarregar a extensão.
    const encerrar: MensagemSW = { tipo: 'encerrar', tabId };
    await chrome.runtime.sendMessage(encerrar);
    mostrarStatus(
      String(erro).includes('Receiving end does not exist')
        ? 'Recarregue a página do portal e tente de novo.'
        : `Não foi possível iniciar o preenchimento: ${String(erro)}`,
      'erro',
    );
  }
}

const abaDaJanela = async () => (await chrome.tabs.query({ active: true, currentWindow: true }))[0];

/** NFSE-02: Preencher só na etapa Pessoas; fora dela, oferece abrir a emissão. Diz se está em Pessoas. */
function configurarAba(aba: chrome.tabs.Tab | undefined): boolean {
  abaAtiva = aba;
  const naPessoas = etapaDaUrl(abaAtiva?.url ?? '') === 'pessoas';
  $<HTMLButtonElement>('preencher').disabled = !naPessoas;
  $('dicaAba').hidden = naPessoas; // contém o botão "Abrir emissão de NFS-e"
  return naPessoas;
}

async function iniciar(): Promise<void> {
  const [padroes, aba] = await Promise.all([repo.lerPadroes(), abaDaJanela(), recarregarModelos()]);
  configurarAba(aba);
  escreverFormulario(formularioDePadroes(padroes, new Date())); // NFSE-01

  // O painel fica aberto: reavalia a aba ao trocar de aba ou quando a URL dela muda.
  chrome.tabs.onActivated.addListener(() => void abaDaJanela().then(configurarAba));
  chrome.tabs.onUpdated.addListener((tabId, mudanca, aba) => {
    if (tabId === abaAtiva?.id && mudanca.url) configurarAba(aba);
  });

  const ao = (id: string, acao: () => Promise<void>) =>
    $(id).addEventListener('click', () => void acao().catch(tratarErro));

  ao('salvarModelo', salvarComoModelo);
  ao('atualizarModelo', atualizarModelo);
  ao('excluirModelo', excluirModelo);
  ao('salvarPadrao', salvarPadrao);
  ao('abrirEmissao', async () => {
    if (abaAtiva?.id !== undefined) await chrome.tabs.update(abaAtiva.id, { url: URL_PESSOAS });
  });
  $('perguntaCancelar').addEventListener('click', () => $<HTMLDialogElement>('pergunta').close('cancelar'));
  $('abrirOpcoes').addEventListener('click', (e) => {
    e.preventDefault();
    void chrome.runtime.openOptionsPage();
  });
  seletorModelo.addEventListener('change', () => void escolherModelo());
  campo('enquadramento').addEventListener('change', mostrarCamposDoEnquadramento);
  $('formulario').addEventListener('submit', (e) => {
    e.preventDefault();
    void preencher().catch(tratarErro);
  });
}

void iniciar();
