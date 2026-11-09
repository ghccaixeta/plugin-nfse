import { formatarCodigoTributacao, nomeDoMunicipio } from '../dominio/formatos';
import type { DadosNota, ResultadoEtapa } from '../dominio/tipos';
import { FalhaCampo, type Acoes } from './acoes';
import { codigoComplementarObrigatorio } from './codigo-complementar';
import { SERVICO as S } from './seletores';

/** NFSE-05 e NFSE-09. Município vazio na nota = município do emitente (lido em Pessoas). */
export async function executarServico(
  acoes: Acoes,
  dados: DadosNota,
  municipioEmitente: string | undefined,
): Promise<ResultadoEtapa> {
  const municipio = dados.municipio || municipioEmitente;
  if (!municipio) throw new FalhaCampo(S.municipioPrestacao.nome);
  // O do emitente vem do portal sem validação: exige 'Nome/UF' antes de buscar.
  const nome = nomeDoMunicipio(municipio);
  if (!nome) throw new FalhaCampo(S.municipioPrestacao.nome, 'fora do formato Nome/UF');

  // Busca pelo nome; escolhe a opção com o texto exato 'Nome/UF' (a busca traz parciais).
  await acoes.selecionarSelect2Ajax(S.municipioPrestacao, nome, { exato: municipio });
  await acoes.selecionarSelect2Ajax(S.codigoTributacao, dados.codigoTributacao, {
    prefixo: `${formatarCodigoTributacao(dados.codigoTributacao)} - `,
  });
  await acoes.marcarRadio(S.imunidadeNao);
  await acoes.preencherTexto(S.descricao, dados.descricao);
  await acoes.selecionarChosen(S.nbs, dados.nbs);

  if (codigoComplementarObrigatorio(acoes.lerValor(S.codigoComplementarObrigatorio))) {
    return { pausa: 'codigoComplementar' };
  }
  return {};
}
