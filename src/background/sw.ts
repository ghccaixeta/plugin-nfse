// Service worker: guarda o pedido de preenchimento de cada aba e limpa quando
// a aba fecha ou sai das páginas de emissão. Lógica em `pedidos.ts`.
import { criarPedidos, tratarMensagem, type MensagemSW } from './pedidos';

const pedidos = criarPedidos(chrome.storage.session);

// O ícone da extensão abre o painel lateral (não há popup).
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((erro: unknown) => {
  console.error('[nfse] painel lateral', erro);
});

chrome.runtime.onMessage.addListener((msg: MensagemSW, sender, responder) => {
  tratarMensagem(pedidos, msg, sender, Date.now()).then(responder, (erro: unknown) => {
    console.error('[nfse] mensagem', msg.tipo, erro);
    responder(null);
  });
  return true; // resposta assíncrona
});

chrome.tabs.onRemoved.addListener((tabId) => void pedidos.encerrar(tabId));

chrome.tabs.onUpdated.addListener((tabId, mudanca) => {
  if (mudanca.url) void pedidos.urlMudou(tabId, mudanca.url);
});
