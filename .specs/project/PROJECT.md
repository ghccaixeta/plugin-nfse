# Preenchedor NFS-e Nacional

**Visão:** Extensão do Chrome que preenche o formulário de emissão do Emissor Nacional da NFS-e a partir de modelos salvos, parando na tela de conferência para o usuário emitir.
**Para:** Prestadores de serviço optantes do Simples Nacional (ME/EPP) que emitem notas parecidas todo mês. Qualquer pessoa pode instalar.
**Resolve:** Preencher manualmente ~20 campos em 3 etapas a cada nota, com risco de errar código/NBS e ter que cancelar.

## Objetivos

- Emitir uma nota recorrente em menos de 1 minuto (escolher modelo → Preencher → conferir → Emitir).
- Zero dado fiscal fora do navegador do usuário (sem servidor, só `chrome.storage`).
- Quando o portal mudar, a falha aparece com o campo exato que quebrou, e a correção fica em um único arquivo de seletores.

## Stack Tecnológica

**Core:**

- Plataforma: Chrome Extension Manifest V3
- Linguagem: TypeScript
- Build: Vite
- Armazenamento: `chrome.storage.local`

**Dependências-chave:** Vite, TypeScript, Vitest (+ jsdom) para testes com HTML salvo do portal.

## Escopo

**v1 inclui:**

- Popup com todos os campos visíveis e editáveis, pré-preenchidos por padrões globais ou pelo modelo escolhido.
- CRUD de modelos (tomador CNPJ + apelido + e-mail/telefone, valor, descrição, município, código de tributação, NBS).
- Padrões globais editáveis (código 010101, NBS 115029000, regime 1, alíquota 2,01).
- Preenchimento das etapas Pessoas → Serviço → Valores, avançando sozinho e parando na conferência.
- Importar/exportar JSON (modelos + padrões opcionais).

**Explicitamente fora de escopo:**

- Clicar em "Emitir NFS-e" (sempre manual).
- Emissão em lote.
- Tomador CPF, exterior ou não informado.
- IBS/CBS (sempre "Não"), código complementar municipal, perfis por CNPJ emitente.
- Servidor, telemetria ou canal de report de erro.
- Navegar sozinho até a emissão a partir de outras páginas.

## Restrições

- Técnicas: o portal (v1.6.0.0) usa jQuery + Chosen + Select2 AJAX; a extensão depende de seletores que podem mudar sem aviso. Sem ambiente de homologação para o portal web.
- Distribuição: Chrome Web Store não listada, conta pessoal do dev; repositório privado no GitHub pessoal; sem marca Nano; aviso "não oficial".
