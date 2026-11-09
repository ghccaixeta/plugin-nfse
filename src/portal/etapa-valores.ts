import type { DadosNota, ResultadoEtapa } from '../dominio/tipos';
import type { Acoes } from './acoes';
import { OPCOES, VALORES as V } from './seletores';

/** NFSE-06. Valor e alíquota vão em centavos/centésimos: a máscara põe a vírgula. */
export async function executarValores(acoes: Acoes, dados: DadosNota): Promise<ResultadoEtapa> {
  await acoes.digitarMascarado(V.valorServico, String(dados.valorCentavos)); // habilita a retenção
  await acoes.marcarRadio(V.retencaoIssqnNao);
  await acoes.selecionarChosen(V.pisCofinsSituacao, OPCOES.pisCofinsNenhum);
  await acoes.selecionarChosen(V.pisCofinsRetencao, OPCOES.pisCofinsNaoRetidos);
  await acoes.marcarRadio(V.tributosAliquotaSN);
  await acoes.digitarMascarado(V.aliquotaSN, String(dados.aliquotaCentesimos));
  return {};
}
