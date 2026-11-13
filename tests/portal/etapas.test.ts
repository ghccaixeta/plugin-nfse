import { describe, expect, it } from 'vitest';
import { FalhaCampo } from '../../src/portal/acoes';
import { codigoComplementarObrigatorio } from '../../src/portal/codigo-complementar';
import { executarPessoas } from '../../src/portal/etapa-pessoas';
import { executarServico } from '../../src/portal/etapa-servico';
import { executarValores } from '../../src/portal/etapa-valores';
import { PESSOAS, SERVICO, VALORES } from '../../src/portal/seletores';
import type { DadosNota, Enquadramento } from '../../src/dominio/tipos';
import { criarAcoesFalsas } from '../fakes/acoes';

const nota = (extra: Partial<DadosNota> = {}): DadosNota => ({
  cnpjTomador: '11222333000181', // fictício
  valorCentavos: 123456,
  descricao: 'Serviços de desenvolvimento',
  dataCompetencia: '09/11/2026',
  codigoTributacao: '010101',
  nbs: '115029000',
  enquadramento: 'meepp',
  regime: 1,
  aliquotaCentesimos: 201,
  ...extra,
});

const MUNICIPIO_EMITENTE = 'Goianésia/GO';

describe('executarPessoas (NFSE-04)', () => {
  it('NFSE-04 segue a ordem exata da etapa e devolve o município do emitente, sem clicar em Avançar', async () => {
    const { acoes, chamadas } = criarAcoesFalsas({ valores: { [PESSOAS.municipioEmitente.nome]: MUNICIPIO_EMITENTE } });
    const r = await executarPessoas(acoes, nota());
    expect(chamadas).toEqual([
      ['marcarRadio', PESSOAS.ibsCbsNao.nome],
      ['digitarMascarado', PESSOAS.dataCompetencia.nome, '09112026'],
      ['marcarRadio', PESSOAS.emitentePrestador.nome],
      ['selecionarChosen', PESSOAS.regime.nome, '1'],
      ['marcarRadio', PESSOAS.tomadorBrasil.nome],
      ['digitarMascarado', PESSOAS.cnpjTomador.nome, '11222333000181'],
      ['clicar', PESSOAS.buscarTomador.nome],
      ['esperar', PESSOAS.nomeTomador.nome, 'preenchido'],
      ['marcarRadio', PESSOAS.intermediarioNaoInformado.nome],
      ['esperar', PESSOAS.municipioEmitente.nome, 'preenchido'],
      ['lerValor', PESSOAS.opcaoSimples.nome],
      ['lerValor', PESSOAS.municipioEmitente.nome],
    ]);
    expect(r).toEqual({ municipioEmitente: MUNICIPIO_EMITENTE });
  });

  it('NFSE-04 preenche e-mail e telefone (só dígitos) quando informados, depois do nome do tomador', async () => {
    const { acoes, chamadas } = criarAcoesFalsas({ valores: { [PESSOAS.municipioEmitente.nome]: MUNICIPIO_EMITENTE } });
    await executarPessoas(acoes, nota({ emailTomador: 'a@b.com', telefoneTomador: '(62) 99999-0000' }));
    const i = chamadas.findIndex((c) => c[1] === PESSOAS.nomeTomador.nome);
    expect(chamadas.slice(i + 1, i + 3)).toEqual([
      ['preencherTexto', PESSOAS.emailTomador.nome, 'a@b.com'],
      ['digitarMascarado', PESSOAS.telefoneTomador.nome, '62999990000'],
    ]);
  });

  it('NFSE-04 não toca em e-mail e telefone quando vazios', async () => {
    const { acoes, chamadas } = criarAcoesFalsas({ valores: { [PESSOAS.municipioEmitente.nome]: MUNICIPIO_EMITENTE } });
    await executarPessoas(acoes, nota({ emailTomador: '', telefoneTomador: '' }));
    const nomes = chamadas.map((c) => c[1]);
    expect(nomes).not.toContain(PESSOAS.emailTomador.nome);
    expect(nomes).not.toContain(PESSOAS.telefoneTomador.nome);
  });

  it('NFSE-08 busca do CNPJ sem nome → FalhaCampo "Nome do tomador" e nada depois', async () => {
    const { acoes, chamadas } = criarAcoesFalsas({ falharEm: PESSOAS.nomeTomador.nome });
    await expect(executarPessoas(acoes, nota())).rejects.toMatchObject({ campo: 'Nome do tomador' });
    expect(chamadas.at(-1)).toEqual(['esperar', PESSOAS.nomeTomador.nome, 'preenchido']);
  });
});

describe('executarServico (NFSE-05, NFSE-09)', () => {
  it('NFSE-05 usa o município do emitente quando a nota não informa, com texto exato', async () => {
    const { acoes, chamadas } = criarAcoesFalsas({ valores: { [SERVICO.codigoComplementarObrigatorio.nome]: 'false' } });
    const r = await executarServico(acoes, nota(), MUNICIPIO_EMITENTE);
    expect(chamadas).toEqual([
      ['selecionarSelect2Ajax', SERVICO.municipioPrestacao.nome, 'Goianésia', { exato: 'Goianésia/GO' }],
      ['selecionarSelect2Ajax', SERVICO.codigoTributacao.nome, '010101', { prefixo: '01.01.01 - ' }],
      ['marcarRadio', SERVICO.imunidadeNao.nome],
      ['preencherTexto', SERVICO.descricao.nome, 'Serviços de desenvolvimento'],
      ['selecionarChosen', SERVICO.nbs.nome, '115029000'],
      ['lerValor', SERVICO.codigoComplementarObrigatorio.nome],
    ]);
    expect(r).toEqual({});
  });

  it('NFSE-05 município informado na nota tem precedência', async () => {
    const { acoes, chamadas } = criarAcoesFalsas();
    await executarServico(acoes, nota({ municipio: 'São Luís de Montes Belos/GO' }), MUNICIPIO_EMITENTE);
    expect(chamadas[0]).toEqual([
      'selecionarSelect2Ajax',
      SERVICO.municipioPrestacao.nome,
      'São Luís de Montes Belos',
      { exato: 'São Luís de Montes Belos/GO' },
    ]);
  });

  it('NFSE-08 sem município na nota nem do emitente → FalhaCampo antes de tocar no formulário', async () => {
    const { acoes, chamadas } = criarAcoesFalsas();
    const erro = await executarServico(acoes, nota(), undefined).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(FalhaCampo);
    expect(erro).toMatchObject({ campo: 'Município da prestação' });
    expect(chamadas).toEqual([]);
  });

  it('NFSE-08 município do emitente fora do formato Nome/UF → FalhaCampo sem tocar no formulário', async () => {
    const { acoes, chamadas } = criarAcoesFalsas();
    await expect(executarServico(acoes, nota(), 'Goiânia')).rejects.toMatchObject({ campo: 'Município da prestação' });
    expect(chamadas).toEqual([]);
  });

  it.each(['true', 'True', 'TRUE'])('NFSE-09 código complementar obrigatório (%s) → pausa sem avançar', async (flag) => {
    const { acoes, chamadas } = criarAcoesFalsas({ valores: { [SERVICO.codigoComplementarObrigatorio.nome]: flag } });
    expect(await executarServico(acoes, nota(), MUNICIPIO_EMITENTE)).toEqual({ pausa: 'codigoComplementar' });
    expect(chamadas.map((c) => c[0])).not.toContain('clicarAvancar');
  });

  it('NFSE-08 código de tributação sem opção → FalhaCampo propaga com o nome do campo', async () => {
    const { acoes } = criarAcoesFalsas({ falharEm: SERVICO.codigoTributacao.nome });
    await expect(executarServico(acoes, nota(), MUNICIPIO_EMITENTE)).rejects.toMatchObject({
      campo: 'Código de tributação',
      message: 'Código de tributação não encontrado',
    });
  });
});

describe('codigoComplementarObrigatorio (NFSE-09)', () => {
  it.each([
    ['true', true],
    ['True', true],
    [' TRUE ', true],
    ['false', false],
    ['False', false],
    ['', false],
  ])('%j → %s', (valor, esperado) => {
    expect(codigoComplementarObrigatorio(valor)).toBe(esperado);
  });
});

describe('executarValores (NFSE-06)', () => {
  it('NFSE-06 valor → retenção Não → PIS/COFINS 00 e Não Retidos → tipo 4 → alíquota', async () => {
    const { acoes, chamadas } = criarAcoesFalsas();
    expect(await executarValores(acoes, nota())).toEqual({});
    expect(chamadas).toEqual([
      ['digitarMascarado', VALORES.valorServico.nome, '123456'],
      ['marcarRadio', VALORES.retencaoIssqnNao.nome],
      ['selecionarChosen', VALORES.pisCofinsSituacao.nome, '0'],
      ['selecionarChosen', VALORES.pisCofinsRetencao.nome, '0'],
      ['marcarRadio', VALORES.tributosAliquotaSN.nome],
      ['digitarMascarado', VALORES.aliquotaSN.nome, '201'],
    ]);
  });

  it('NFSE-08 falha na alíquota propaga com o nome do campo', async () => {
    const { acoes } = criarAcoesFalsas({ falharEm: VALORES.aliquotaSN.nome });
    await expect(executarValores(acoes, nota())).rejects.toMatchObject({ campo: 'Alíquota do Simples Nacional' });
  });
});

describe('Emitente MEI (MEI-05..08)', () => {
  const portal = (opcao: string) =>
    criarAcoesFalsas({
      valores: { [PESSOAS.municipioEmitente.nome]: MUNICIPIO_EMITENTE, [PESSOAS.opcaoSimples.nome]: opcao },
    });

  it('MEI-05 MEI não seleciona o regime e segue o resto da etapa', async () => {
    const { acoes, chamadas } = portal('2');
    expect(await executarPessoas(acoes, nota({ enquadramento: 'mei' }))).toEqual({
      municipioEmitente: MUNICIPIO_EMITENTE,
    });
    expect(chamadas.map((c) => c[1])).not.toContain(PESSOAS.regime.nome);
    expect(chamadas.map((c) => c[1])).toContain(PESSOAS.nomeTomador.nome);
  });

  it.each<[Enquadramento, string, string]>([
    ['mei', '3', 'Enquadramento do painel é MEI, mas o emitente no portal é ME/EPP. Ajuste e preencha de novo.'],
    ['meepp', '2', 'Enquadramento do painel é ME/EPP, mas o emitente no portal é MEI. Ajuste e preencha de novo.'],
    ['mei', '1', 'Enquadramento do painel é MEI, mas o emitente no portal é não optante do Simples. Ajuste e preencha de novo.'],
  ])('MEI-06 painel %s × portal %s → para com aviso', async (enquadramento, opcao, mensagem) => {
    const { acoes } = portal(opcao);
    await expect(executarPessoas(acoes, nota({ enquadramento }))).rejects.toMatchObject({
      campo: 'Enquadramento',
      message: mensagem,
    });
  });

  it.each([
    ['mei', '2'],
    ['meepp', '3'],
    ['mei', ''], // portal sem a opção legível: não bloqueia
  ] as const)('MEI-06 painel %s × portal %j → segue', async (enquadramento, opcao) => {
    const { acoes } = portal(opcao);
    await expect(executarPessoas(acoes, nota({ enquadramento }))).resolves.toEqual({
      municipioEmitente: MUNICIPIO_EMITENTE,
    });
  });

  it('MEI-07 Valores com MEI só digita o valor', async () => {
    const { acoes, chamadas } = criarAcoesFalsas();
    expect(await executarValores(acoes, nota({ enquadramento: 'mei' }))).toEqual({});
    expect(chamadas).toEqual([['digitarMascarado', VALORES.valorServico.nome, '123456']]);
  });

  it('MEI-08 Valores com ME/EPP explícito faz o fluxo completo', async () => {
    const { acoes, chamadas } = criarAcoesFalsas();
    await executarValores(acoes, nota({ enquadramento: 'meepp' }));
    expect(chamadas).toHaveLength(6);
  });
});
