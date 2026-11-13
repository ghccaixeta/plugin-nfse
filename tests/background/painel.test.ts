import { describe, expect, it, vi } from 'vitest';
import { configurarPainel } from '../../src/background/painel';

describe('configurarPainel', () => {
  it('FFX05_com_sidePanel_abre_o_painel_pelo_icone', () => {
    const setPanelBehavior = vi.fn().mockResolvedValue(undefined);
    const addListener = vi.fn();
    configurarPainel({ sidePanel: { setPanelBehavior }, action: { onClicked: { addListener } } });

    expect(setPanelBehavior).toHaveBeenCalledWith({ openPanelOnActionClick: true });
    expect(addListener).not.toHaveBeenCalled();
  });

  it('FFX06_sem_sidePanel_o_icone_alterna_a_barra_lateral', () => {
    const toggle = vi.fn().mockResolvedValue(undefined);
    let aoClicar: (() => void) | undefined;
    configurarPainel({
      sidebarAction: { toggle },
      action: { onClicked: { addListener: (f: () => void) => (aoClicar = f) } },
    });

    expect(toggle).not.toHaveBeenCalled();
    aoClicar?.();
    expect(toggle).toHaveBeenCalledOnce();
  });
});
