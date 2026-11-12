#!/usr/bin/env node
// Garante que nenhum dado pessoal real aparece em arquivo versionável.
// Duas camadas:
//  - genérica (sempre): CNPJ ou CPF com dígito verificador válido que não seja
//    um dos fictícios — pega CNPJ real digitado à mão num teste;
//  - específica (se fixtures-raw/ existir): valores das capturas reais e os
//    termos de fixtures-raw/termos-sensiveis.json.
// Reporta arquivo:linha e categoria, nunca o valor. Roda no `npm test`.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CAPTURAS,
  CNPJS_FICTICIOS,
  CPFS_FICTICIOS,
  PADRAO,
  RAIZ,
  apenasDigitos,
  cnpjValido,
  cpfValido,
  lerCaptura,
  lerTermos,
  temOrigem,
} from './dados-sensiveis.mjs';

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const ficticios = new Set([...CNPJS_FICTICIOS, ...CPFS_FICTICIOS]);

/** Regras: cada uma acha ocorrências numa linha. */
const regras = [
  {
    categoria: 'CNPJ válido não fictício',
    achar: (linha) =>
      [...linha.matchAll(PADRAO.cnpjFormatado), ...linha.matchAll(PADRAO.cnpjCru)]
        .map((m) => apenasDigitos(m[0]))
        .some((c) => cnpjValido(c) && !ficticios.has(c)),
  },
  {
    categoria: 'CPF válido não fictício',
    achar: (linha) =>
      [...linha.matchAll(PADRAO.cpf)].map((m) => apenasDigitos(m[0])).some((c) => cpfValido(c) && !ficticios.has(c)),
  },
];

if (temOrigem()) {
  const bruto = CAPTURAS.map(lerCaptura).join('\n');
  const reais = (padrao) => [...new Set(bruto.match(padrao) ?? [])];
  const literal = (categoria, valores, flags = '') =>
    valores.length && regras.push({ categoria, re: new RegExp(valores.map(escapar).join('|'), flags) });
  literal('CNPJ real', reais(PADRAO.cnpjFormatado).flatMap((c) => [c, apenasDigitos(c)]));
  literal('e-mail real', reais(PADRAO.email), 'i');
  literal('CEP real', reais(PADRAO.cep));
  const telefones = reais(PADRAO.telefone).map((t) => apenasDigitos(t).split('').join('\\D?'));
  if (telefones.length) regras.push({ categoria: 'telefone real', re: new RegExp(telefones.join('|')) });
  lerTermos().forEach(([re], i) => regras.push({ categoria: `termo sensível #${i}`, re: new RegExp(re.source, 'i') }));
}

const testa = (regra, texto) => (regra.re ? regra.re.test(texto) : regra.achar(texto));

const arquivos = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: RAIZ, encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && !/^(node_modules|dist)\//.test(f) && f !== 'package-lock.json');

let achados = 0;
for (const arquivo of arquivos) {
  let bytes;
  try {
    bytes = readFileSync(join(RAIZ, arquivo));
  } catch {
    continue;
  }
  if (bytes.includes(0)) continue; // binário
  const texto = bytes.toString('utf8');
  const suspeitas = regras.filter((r) => testa(r, texto)); // arquivo inteiro primeiro: quase todos limpos
  if (!suspeitas.length) continue;
  texto.split('\n').forEach((linha, i) => {
    for (const regra of suspeitas) {
      if (testa(regra, linha)) {
        console.log(`${arquivo}:${i + 1}  ${regra.categoria}`);
        achados++;
      }
    }
  });
}

const origem = temOrigem() ? '' : ' (sem fixtures-raw/: só a checagem genérica)';
console.log(achados ? `\n${achados} ocorrência(s) de dado real.` : `OK: ${arquivos.length} arquivos sem dado real${origem}.`);
process.exit(achados ? 1 : 0);
