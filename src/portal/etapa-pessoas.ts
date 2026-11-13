import { apenasDigitos } from '../dominio/formatos';
import type { DadosNota, Enquadramento, ResultadoEtapa } from '../dominio/tipos';
import { FalhaCampo, type Acoes } from './acoes';
import { NOME_OPCAO_SIMPLES, OPCAO_SIMPLES, PESSOAS as P } from './seletores';

/** MEI-06: para se o enquadramento do painel não for o do emitente. Opção ilegível não bloqueia. */
function conferirEnquadramento(opcaoPortal: string, enquadramento: Enquadramento): void {
  const esperada = OPCAO_SIMPLES[enquadramento];
  const doPortal = NOME_OPCAO_SIMPLES[opcaoPortal];
  if (!doPortal || opcaoPortal === esperada) return;
  throw new FalhaCampo(
    P.opcaoSimples.nome,
    `do painel é ${NOME_OPCAO_SIMPLES[esperada]}, mas o emitente no portal é ${doPortal}. Ajuste e preencha de novo.`,
  );
}

/** NFSE-04, MEI-05. Até responder IBS/CBS o portal mantém os demais campos desabilitados. */
export async function executarPessoas(acoes: Acoes, dados: DadosNota): Promise<ResultadoEtapa> {
  const { enquadramento } = dados;
  await acoes.marcarRadio(P.ibsCbsNao);
  await acoes.digitarMascarado(P.dataCompetencia, apenasDigitos(dados.dataCompetencia)); // carrega o emitente
  await acoes.marcarRadio(P.emitentePrestador);
  // MEI: o portal esconde o regime (só existe para ME/EPP).
  if (enquadramento === 'meepp') await acoes.selecionarChosen(P.regime, String(dados.regime));
  await acoes.marcarRadio(P.tomadorBrasil);
  await acoes.digitarMascarado(P.cnpjTomador, dados.cnpjTomador);
  await acoes.clicar(P.buscarTomador);
  await acoes.esperar(P.nomeTomador, 'preenchido');
  if (dados.emailTomador) await acoes.preencherTexto(P.emailTomador, dados.emailTomador);
  if (dados.telefoneTomador) await acoes.digitarMascarado(P.telefoneTomador, apenasDigitos(dados.telefoneTomador));
  await acoes.marcarRadio(P.intermediarioNaoInformado);
  await acoes.esperar(P.municipioEmitente, 'preenchido'); // emitente carregado
  conferirEnquadramento(acoes.lerValor(P.opcaoSimples), enquadramento);
  return { municipioEmitente: acoes.lerValor(P.municipioEmitente) };
}
