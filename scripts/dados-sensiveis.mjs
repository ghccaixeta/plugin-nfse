// Definição única de "dado sensível" para os scripts de fixtures:
// anonimizar-fixtures.mjs troca, verificar-vazamento.mjs procura.
// Os dados reais ficam só em fixtures-raw/ (ignorado pelo git).

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
// Só módulos-folha (sem imports): o Node >= 22.18 roda .ts direto, mas não resolve imports sem extensão.
import { cnpjValido, cpfValido } from '../src/dominio/documentos.ts';
import { apenasDigitos } from '../src/dominio/formatos.ts';

export { apenasDigitos, cnpjValido, cpfValido };

export const RAIZ = resolve(import.meta.dirname, '..');
export const ORIGEM = join(RAIZ, 'fixtures-raw');
export const CAPTURAS = ['pessoas', 'servico', 'valores', 'emitir'];
const TERMOS = join(ORIGEM, 'termos-sensiveis.json');

/** CNPJs fictícios com DV válido: os únicos que podem aparecer em arquivo versionável. */
export const CNPJS_FICTICIOS = ['11222333000181', '11444777000161', '45997418000153'];

/** CPFs fictícios de exemplo permitidos em testes. */
export const CPFS_FICTICIOS = ['52998224725'];

/** Padrões de dado pessoal (sempre com flag g; use .source para testes sem estado). */
export const PADRAO = {
  cnpjFormatado: /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g,
  cnpjCru: /(?<!\d)\d{14}(?!\d)/g,
  cpf: /(?<!\d)\d{3}\.\d{3}\.\d{3}-\d{2}(?!\d)/g,
  email: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g,
  telefone: /\(\d{2}\)\s?9?\d{4}-?\d{4}/g,
  cep: /(?<!\d)\d{2}\.\d{3}-\d{3}(?!\d)/g,
};

export const temOrigem = () => existsSync(ORIGEM);

/** Pares [regex (gi), substituto] de fixtures-raw/termos-sensiveis.json. */
export function lerTermos() {
  if (!existsSync(TERMOS)) throw new Error(`Crie ${TERMOS} com pares [regex, substituto] para nomes e endereço reais`);
  return JSON.parse(readFileSync(TERMOS, 'utf8')).map(([re, sub]) => [new RegExp(re, 'gi'), sub]);
}

/** HTML real de uma captura (salvo como string JSON pelo Playwright). */
export const lerCaptura = (nome) => JSON.parse(readFileSync(join(ORIGEM, `${nome}.html`), 'utf8'));

