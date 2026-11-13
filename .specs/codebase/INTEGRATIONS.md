# Integrações

- **Emissor Nacional NFS-e** (`https://www.nfse.gov.br/EmissorNacional/*`), portal v1.6.0.0. Integração apenas via DOM (jQuery 3.3.1, Chosen, Select2 v4, VMasker da própria página); mapeamento em `docs/mapeamento-portal.md`. Nenhuma chamada HTTP própria.
- **Chrome APIs:** `storage` (local + session), `tabs`, `sidePanel` (Chrome 116+) / `sidebarAction` (Firefox, namespace `browser`), `runtime` (mensagens internas; sem `externally_connectable`). Content scripts declarados no manifest (sem `scripting`).
