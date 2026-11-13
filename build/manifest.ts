// Converte o manifest do Chrome (`src/manifest.json`) para o Firefox no build.
// O Firefox não tem service worker de extensão nem `sidePanel`: usa script de
// background e `sidebar_action`. `data_collection_permissions` (exigido pelo AMO) só existe no 140+ (ESR).

/** ID fixo da extensão no Firefox — não mudar depois da primeira assinatura no AMO. */
export const GECKO_ID = '{43c62ad5-ac62-4079-a086-25b9f04f1584}';

/** Campos do manifest do Chrome que a conversão lê; o resto passa como está. */
export interface ManifestChrome {
  [chave: string]: unknown;
  background: { service_worker: string; type?: string };
  side_panel: { default_path: string };
  options_page: string;
  permissions: string[];
  action: { default_title: string };
}

/** Não muta `base`: devolve um objeto novo (aninhados não alterados são compartilhados). */
export function manifestParaFirefox(base: ManifestChrome): Record<string, unknown> {
  const {
    background,
    side_panel: painel,
    options_page: opcoes,
    minimum_chrome_version: _,
    permissions,
    ...resto
  } = base;

  return {
    ...resto,
    permissions: permissions.filter((p) => p !== 'sidePanel'),
    background: { scripts: [background.service_worker], type: background.type },
    sidebar_action: {
      default_panel: painel.default_path,
      default_title: resto.action.default_title,
      open_at_install: false,
    },
    options_ui: { page: opcoes, open_in_tab: true },
    browser_specific_settings: {
      gecko: {
        id: GECKO_ID,
        strict_min_version: '140.0',
        data_collection_permissions: { required: ['none'] },
      },
    },
  };
}

/** Alvo do build, escolhido por `NAVEGADOR=firefox` (padrão: Chrome em `dist/`). */
export function alvoDoBuild(navegador = process.env.NAVEGADOR ?? 'chrome') {
  if (navegador !== 'chrome' && navegador !== 'firefox') {
    throw new Error(`NAVEGADOR deve ser chrome ou firefox (recebido: ${navegador})`);
  }
  return { navegador, pastaSaida: navegador === 'firefox' ? 'dist-firefox' : 'dist' } as const;
}
