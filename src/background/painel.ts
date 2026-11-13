// O ícone da extensão abre a interface na lateral (não há popup).
// Chrome: `sidePanel`. Firefox: `sidebarAction`, que só abre dentro do gesto
// do usuário — por isso `toggle()` é chamado direto no `onClicked`, sem await antes.

export interface ApiPainel {
  sidePanel?: { setPanelBehavior(opcoes: { openPanelOnActionClick: boolean }): Promise<void> };
  sidebarAction?: { toggle(): Promise<void> };
  action: { onClicked: { addListener(callback: () => void): void } };
}

const logarErro = (erro: unknown) => console.error('[nfse] painel lateral', erro);

export function configurarPainel(api: ApiPainel): void {
  if (api.sidePanel) {
    api.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(logarErro);
    return;
  }
  const { sidebarAction } = api;
  if (sidebarAction) api.action.onClicked.addListener(() => void sidebarAction.toggle().catch(logarErro));
}
