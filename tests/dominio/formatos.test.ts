import { describe, expect, it } from 'vitest';
import {
  apenasDigitos,
  formatarCentavosBR,
  formatarCodigoTributacao,
  hojeBR,
  parseAliquotaBR,
  parseMoedaBR,
} from '../../src/dominio/formatos';

describe('parseMoedaBR (NFSE-03)', () => {
  it.each([
    ['1.234,56', 123456],
    ['1234,56', 123456],
    ['10', 1000],
    ['10,5', 1050],
    ['0,00', 0],
    ['1.000.000,01', 100000001],
    ['  12,30 ', 1230],
  ])('NFSE-03 converte %j em %i centavos', (texto, centavos) => {
    expect(parseMoedaBR(texto)).toBe(centavos);
  });

  it.each(['abc', '', '   ', '10,555', '1,2,3', '-5', '12.34', '1.23,00', '10,'])(
    'NFSE-03 rejeita %j',
    (texto) => {
      expect(parseMoedaBR(texto)).toBeNull();
    },
  );
});

describe('parseAliquotaBR (NFSE-03)', () => {
  it('NFSE-03 converte 2,01 em 201 centésimos', () => {
    expect(parseAliquotaBR('2,01')).toBe(201);
  });

  it('NFSE-03 aceita inteiro e uma casa', () => {
    expect(parseAliquotaBR('5')).toBe(500);
    expect(parseAliquotaBR('3,5')).toBe(350);
  });

  it('NFSE-03 rejeita texto inválido', () => {
    expect(parseAliquotaBR('x')).toBeNull();
  });
});

describe('formatarCentavosBR', () => {
  it.each([
    [201, '2,01'],
    [123456, '1.234,56'],
    [0, '0,00'],
    [5, '0,05'],
    [100000001, '1.000.000,01'],
  ])('formata %i como %j', (centavos, texto) => {
    expect(formatarCentavosBR(centavos)).toBe(texto);
  });

  it('é inversa de parseMoedaBR', () => {
    expect(parseMoedaBR(formatarCentavosBR(987654))).toBe(987654);
  });
});

describe('formatarCodigoTributacao (NFSE-05)', () => {
  it('NFSE-05 formata 010101 como 01.01.01', () => {
    expect(formatarCodigoTributacao('010101')).toBe('01.01.01');
  });

  it('NFSE-05 ignora não dígitos na entrada', () => {
    expect(formatarCodigoTributacao('01.07.01')).toBe('01.07.01');
  });
});

describe('apenasDigitos', () => {
  it('remove tudo que não é dígito', () => {
    expect(apenasDigitos('11.444.777/0001-61')).toBe('11444777000161');
    expect(apenasDigitos('(62) 9 8888-7777')).toBe('62988887777');
    expect(apenasDigitos('')).toBe('');
  });
});

describe('hojeBR (NFSE-01)', () => {
  it('NFSE-01 formata a data como dd/mm/aaaa', () => {
    expect(hojeBR(new Date(2026, 10, 9))).toBe('09/11/2026');
    expect(hojeBR(new Date(2026, 0, 31))).toBe('31/01/2026');
  });
});
