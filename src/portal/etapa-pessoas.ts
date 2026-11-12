import { apenasDigitos } from '../dominio/formatos';
import type { DadosNota, ResultadoEtapa } from '../dominio/tipos';
import type { Acoes } from './acoes';
import { PESSOAS as P } from './seletores';

/** NFSE-04. Até responder IBS/CBS o portal mantém os demais campos desabilitados. */
export async function executarPessoas(acoes: Acoes, dados: DadosNota): Promise<ResultadoEtapa> {
  await acoes.marcarRadio(P.ibsCbsNao);
  await acoes.digitarMascarado(P.dataCompetencia, apenasDigitos(dados.dataCompetencia)); // carrega o emitente
  await acoes.marcarRadio(P.emitentePrestador);
  await acoes.selecionarChosen(P.regime, String(dados.regime));
  await acoes.marcarRadio(P.tomadorBrasil);
  await acoes.digitarMascarado(P.cnpjTomador, dados.cnpjTomador);
  await acoes.clicar(P.buscarTomador);
  await acoes.esperar(P.nomeTomador, 'preenchido');
  if (dados.emailTomador) await acoes.preencherTexto(P.emailTomador, dados.emailTomador);
  if (dados.telefoneTomador) await acoes.digitarMascarado(P.telefoneTomador, apenasDigitos(dados.telefoneTomador));
  await acoes.marcarRadio(P.intermediarioNaoInformado);
  await acoes.esperar(P.municipioEmitente, 'preenchido');
  return { municipioEmitente: acoes.lerValor(P.municipioEmitente) };
}
