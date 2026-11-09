#!/usr/bin/env node
// Gera tests/fixtures/*.html a partir de fixtures-raw/*.html, sem dados pessoais.
//
// fixtures-raw/ (ignorado pelo git) tem o HTML real capturado pelo Playwright,
// salvo como string JSON. Os dados reais NUNCA entram neste script: nomes e
// endereço vêm de fixtures-raw/termos-sensiveis.json, uma lista de pares
// [regex, substituto] (flags "gi"; o substituto aceita $1). O resto é genérico:
// CNPJ, e-mail, telefone, CEP, idr, tokens e scripts inline.
//
// Uso: node scripts/anonimizar-fixtures.mjs

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CAPTURAS, CNPJS_FICTICIOS, PADRAO, RAIZ, apenasDigitos, cnpjValido, lerCaptura, lerTermos } from './dados-sensiveis.mjs';

const DESTINO = join(RAIZ, 'tests', 'fixtures');

const formatarCnpj = (c) => c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

const mapaCnpj = new Map();
function cnpjFicticio(real) {
  if (!mapaCnpj.has(real)) {
    const ficticio = CNPJS_FICTICIOS[mapaCnpj.size];
    if (!ficticio) throw new Error('Mais CNPJs reais que fictícios; amplie CNPJS_FICTICIOS');
    mapaCnpj.set(real, ficticio);
  }
  return mapaCnpj.get(real);
}

function anonimizar(html, termos) {
  let h = html;

  // Scripts inline guardam sessão (accessToken JWT, inscrição do emitente). Os com src ficam.
  h = h.replace(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi, '');

  // Tokens de sessão e antifalsificação.
  h = h.replace(/(name="__RequestVerificationToken"[^>]*value=")[^"]*/g, '$1TOKEN-FICTICIO');
  h = h.replace(/(value=")[^"]*("[^>]*name="__RequestVerificationToken")/g, '$1TOKEN-FICTICIO$2');
  h = h.replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, 'JWT-FICTICIO');

  // idr (id do rascunho) nas URLs e no hidden hdfIdr.
  const idrs = new Set([...h.matchAll(/idr=([^"&\s\\<]+)/g)].map((m) => m[1]));
  for (const m of h.matchAll(/id="hdfIdr"[^>]*value="([^"]+)"/g)) idrs.add(m[1]);
  for (const idr of idrs) h = h.split(idr).join('IDR-FICTICIO');

  // CNPJ formatado sempre; CNPJ cru só se o DV bater (evita falso positivo em outros números).
  h = h.replace(PADRAO.cnpjFormatado, (m) => formatarCnpj(cnpjFicticio(apenasDigitos(m))));
  h = h.replace(PADRAO.cnpjCru, (m) => (cnpjValido(m) ? cnpjFicticio(m) : m));

  h = h.replace(PADRAO.cpf, '000.000.000-00'); // tomador pessoa física
  h = h.replace(PADRAO.email, 'contato@exemplo.com.br');
  h = h.replace(PADRAO.telefone, '(00) 0000-0000');
  h = h.replace(PADRAO.cep, '00.000-000');

  for (const [re, sub] of termos) h = h.replace(re, sub);
  return h;
}

const termos = lerTermos();
mkdirSync(DESTINO, { recursive: true });
for (const etapa of CAPTURAS) {
  const bruto = lerCaptura(etapa);
  writeFileSync(join(DESTINO, `${etapa}.html`), anonimizar(bruto, termos));
  console.log(`tests/fixtures/${etapa}.html`);
}
console.log(`${mapaCnpj.size} CNPJ(s) substituído(s).`);
