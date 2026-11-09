import { describe, expect, it } from 'vitest';
import { etapaDaUrl, proximaEtapa } from '../../src/dominio/etapas';

const BASE = 'https://www.nfse.gov.br/EmissorNacional/DPS';

describe('etapaDaUrl (NFSE-02)', () => {
  it.each([
    [`${BASE}/Pessoas`, 'pessoas'],
    [`${BASE}/Pessoas?idr=abc123`, 'pessoas'],
    [`${BASE}/Pessoas#topo`, 'pessoas'],
    [`${BASE}/Servico?idr=x`, 'servico'],
    [`${BASE}/Tributacao`, 'valores'],
    [`${BASE}/EmitirNFSe`, 'conferencia'],
    [`${BASE}/pessoas`, 'pessoas'],
    [`${BASE}/Pessoas/`, 'pessoas'],
  ])('NFSE-02 %s → %s', (url, etapa) => {
    expect(etapaDaUrl(url)).toBe(etapa);
  });

  it.each([
    'https://www.nfse.gov.br/EmissorNacional/',
    'https://www.nfse.gov.br/EmissorNacional/Notas/Emitidas',
    `${BASE}/Outra`,
    `${BASE}/constructor`,
    `${BASE}/toString`,
    'https://nfse.gov.br/EmissorNacional/DPS/Pessoas',
    'https://www.nfse.gov.br.exemplo.com/EmissorNacional/DPS/Pessoas',
    'http://www.nfse.gov.br/EmissorNacional/DPS/Pessoas',
    'chrome://extensions',
    'não é url',
    '',
  ])('NFSE-02 %j → null', (url) => {
    expect(etapaDaUrl(url)).toBeNull();
  });
});

describe('proximaEtapa', () => {
  it('segue Pessoas → Serviço → Valores → Conferência', () => {
    expect(proximaEtapa('pessoas')).toBe('servico');
    expect(proximaEtapa('servico')).toBe('valores');
    expect(proximaEtapa('valores')).toBe('conferencia');
  });

  it('Conferência é a última', () => {
    expect(proximaEtapa('conferencia')).toBeNull();
  });
});
