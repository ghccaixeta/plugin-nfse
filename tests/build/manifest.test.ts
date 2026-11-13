import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { alvoDoBuild, GECKO_ID, manifestParaFirefox, type ManifestChrome } from '../../build/manifest';

const base = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../src/manifest.json'), 'utf8'),
) as ManifestChrome;

describe('manifestParaFirefox', () => {
  const ff = manifestParaFirefox(base);

  it('FFX01_background_vira_scripts_mantendo_modulo', () => {
    expect(ff.background).toEqual({ scripts: ['sw.js'], type: 'module' });
  });

  it('FFX01_side_panel_vira_sidebar_action', () => {
    expect(ff.side_panel).toBeUndefined();
    expect(ff.sidebar_action).toEqual({
      default_panel: 'popup/index.html',
      default_title: 'Preenchedor NFS-e',
      open_at_install: false,
    });
  });

  it('FFX01_remove_permissao_sidePanel_e_mantem_as_outras', () => {
    expect(ff.permissions).toEqual(['storage', 'tabs']);
  });

  it('FFX01_options_page_vira_options_ui_em_aba', () => {
    expect(ff.options_page).toBeUndefined();
    expect(ff.options_ui).toEqual({ page: 'opcoes/index.html', open_in_tab: true });
  });

  it('FFX01_remove_minimum_chrome_version_e_adiciona_gecko', () => {
    expect(ff.minimum_chrome_version).toBeUndefined();
    expect(ff.browser_specific_settings).toEqual({
      gecko: {
        id: GECKO_ID,
        strict_min_version: '140.0',
        data_collection_permissions: { required: ['none'] },
      },
    });
  });

  it('FFX01_mantem_o_resto_igual', () => {
    for (const chave of ['manifest_version', 'name', 'version', 'description', 'host_permissions', 'content_scripts', 'action']) {
      expect(ff[chave], chave).toEqual(base[chave]);
    }
  });

  it('FFX02_nao_muta_o_manifest_base', () => {
    const copia = structuredClone(base);
    manifestParaFirefox(base);
    expect(base).toEqual(copia);
  });
});

describe('alvoDoBuild', () => {
  it('FFX03_firefox_sai_em_dist_firefox', () => {
    expect(alvoDoBuild('firefox')).toEqual({ navegador: 'firefox', pastaSaida: 'dist-firefox' });
  });

  it('FFX04_chrome_continua_em_dist', () => {
    expect(alvoDoBuild('chrome')).toEqual({ navegador: 'chrome', pastaSaida: 'dist' });
  });

  it('rejeita_navegador_desconhecido', () => {
    expect(() => alvoDoBuild('safari')).toThrow(/NAVEGADOR/);
  });
});
