// Página de opções: importar/exportar (NFSE-17..19). Fica aqui e não no popup
// porque o seletor de arquivo fecha o popup antes de o arquivo ser lido.
import { repositorioLocal } from '../armazenamento/repositorio';
import { analisarImportacao, exportar, mesclarModelos, nomeArquivoExportacao } from '../dominio/importacao';
import { $, mostrarStatus } from '../ui/pagina';

const repo = repositorioLocal();

async function exportarArquivo(): Promise<void> {
  const [padroes, modelos] = await Promise.all([repo.lerPadroes(), repo.listarModelos()]);
  const blob = new Blob([JSON.stringify(exportar(padroes, modelos), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivoExportacao(new Date()); // NFSE-17
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  mostrarStatus(`Exportados ${modelos.length} modelo(s) e os padrões.`, 'ok');
}

async function importarArquivo(arquivo: File): Promise<void> {
  const atuais = await repo.listarModelos();
  const analise = analisarImportacao(await arquivo.text(), atuais);
  if (!analise.ok) return mostrarStatus(`Importação cancelada, nada foi alterado: ${analise.erro}`, 'erro'); // NFSE-19

  // NFSE-18: pergunta, um por um, se substitui cada apelido repetido.
  const substitutos = analise.conflitos.filter((m) =>
    confirm(`Já existe um modelo "${m.apelido}". Substituir pelo do arquivo?`),
  );
  const importarPadroes = $<HTMLInputElement>('importarPadroes').checked && analise.padroes !== undefined;
  const modelos = mesclarModelos(atuais, analise.novos, substitutos);
  await repo.substituirTudo(importarPadroes ? analise.padroes : undefined, modelos);

  const mantidos = analise.conflitos.length - substitutos.length;
  const partes = [
    `${analise.novos.length} modelo(s) adicionado(s)`,
    `${substitutos.length} substituído(s)`,
    `${mantidos} mantido(s) como estava(m)`,
    importarPadroes ? 'padrões importados' : 'padrões não alterados',
  ];
  mostrarStatus(`Importação concluída: ${partes.join(', ')}.`, 'ok');
}

$('exportar').addEventListener('click', () => {
  exportarArquivo().catch((e: unknown) => mostrarStatus(String(e), 'erro'));
});

$<HTMLInputElement>('arquivo').addEventListener('change', (e) => {
  const input = e.currentTarget as HTMLInputElement;
  const arquivo = input.files?.[0];
  if (!arquivo) return;
  importarArquivo(arquivo)
    .catch((erro: unknown) => mostrarStatus(String(erro), 'erro'))
    .finally(() => (input.value = '')); // permite reimportar o mesmo arquivo
});
