// Mensagens de validação que o portal (ASP.NET) mostra após um Avançar recusado.
import { ERRO_VALIDACAO } from './seletores';

/** Mensagens visíveis, cada uma prefixada pelo rótulo do campo quando existe. */
export function mensagensDeValidacao(doc: Document): string[] {
  const rotulos = [...doc.querySelectorAll('label')];
  return [...doc.querySelectorAll<HTMLElement>(ERRO_VALIDACAO)]
    .map((erro) => {
      const texto = erro.textContent?.trim() ?? '';
      if (!texto) return '';
      const nome = erro.dataset.valmsgFor ?? '';
      const id = nome.replace(/[.[\]]/g, '_');
      const rotulo = rotulos.find((l) => l.htmlFor === id)?.textContent?.trim() || nome;
      return rotulo ? `${rotulo}: ${texto}` : texto;
    })
    .filter(Boolean);
}

/** Texto único para "o portal recusou o Avançar", com até 3 mensagens da página. */
export function descreverRecusa(doc: Document): string {
  const mensagens = mensagensDeValidacao(doc).slice(0, 3).join('; ');
  return `o portal recusou os dados. ${mensagens || 'Confira os avisos na página.'}`;
}
