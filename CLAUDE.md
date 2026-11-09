# Preenchedor NFS-e Nacional

Extensão Chrome MV3 (TypeScript + Vite) que preenche o formulário do Emissor Nacional da NFS-e. Idioma do projeto: português (PT-BR).

## Comandos

- `npm test` — Vitest
- `npm run build` — gera `dist/` (carregar como extensão sem compactação)
- `npm run typecheck`

## Regras

- A extensão NUNCA clica em "Emitir NFS-e".
- Nenhum dado sai do navegador: sem fetch para servidores próprios, sem telemetria.
- `fixtures-raw/` e `.playwright-mcp/` têm dados reais — nunca commitar; fixtures de teste vão anonimizadas em `tests/fixtures/`.
- Seletores do portal só em `src/portal/seletores.ts`.
- Gitflow clássico (git-flow-next). Scopes de commit: `popup`, `portal`, `dominio`, `armazenamento`, `build`, `docs`.

## Referência .specs/

Documentação estruturada do projeto. Consultar antes de tomar decisões.

### Projeto
- `.specs/project/PROJECT.md` — Visão, goals, stack, scope
- `.specs/project/ROADMAP.md` — Features planejadas e milestones
- `.specs/project/STATE.md` — Decisões, lições, preferências

### Codebase
- `.specs/codebase/STACK.md` — Stack tecnológica e dependências
- `.specs/codebase/ARCHITECTURE.md` — Padrões arquiteturais e fluxo de dados
- `.specs/codebase/CONVENTIONS.md` — Convenções de código, naming e glossário
- `.specs/codebase/STRUCTURE.md` — Estrutura de diretórios
- `.specs/codebase/TESTING.md` — Infraestrutura e padrões de teste
- `.specs/codebase/INTEGRATIONS.md` — Integrações externas
- `.specs/codebase/CONCERNS.md` — Tech debt, riscos e áreas frágeis

### Features
- `.specs/features/YYYY-MM-DD-[feature]/spec.md` — Requisitos e critérios de aceite
- `.specs/features/YYYY-MM-DD-[feature]/design.md` — Arquitetura e componentes
- `.specs/features/YYYY-MM-DD-[feature]/tasks.md` — Tasks atômicas de implementação

### Decisões (opcional)
- `.specs/decisions/NNNN-titulo.md` — ADRs
