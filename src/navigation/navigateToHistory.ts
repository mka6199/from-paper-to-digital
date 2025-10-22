export function navigateToHistory(navigation: any, workerId?: string) {
    const parent = navigation.getParent?.();
    const goLocal = () =>
      navigation.navigate('HistoryList', workerId ? { workerId } : undefined);
  
    if (!parent) return goLocal();
  
    const state: any = parent.getState?.() || {};
    const names: string[] =
      state?.routeNames ??
      (state?.routes ? state.routes.map((r: any) => r.name) : []);
  
    const target =
      ['HistoryStack', 'History', 'HistoryTab', 'HistoryNavigator'].find((n) =>
        names?.includes(n)
      ) ?? names.find((n) => /history/i.test(n));
  
    if (target) {
      parent.navigate(target, {
        screen: 'HistoryList',
        params: workerId ? { workerId } : undefined,
      });
    } else {
      goLocal();
    }
  }
  