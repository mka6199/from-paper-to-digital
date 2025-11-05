import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';

export const navRef = createNavigationContainerRef();

const pending: Array<() => void> = [];

export function whenNavReady(fn: () => void) {
  if (navRef.isReady()) fn();
  else pending.push(fn);
}

export function onNavContainerReady() {
  while (pending.length) {
    const fn = pending.shift();
    try { fn?.(); } catch {}
  }
}

export type RootRouteName = 'Splash' | 'Auth' | 'Main' | 'Admin';

function currentRoot(): RootRouteName | undefined {
  try {
    const s = navRef.getRootState();
    const r = s?.routes?.[s.index ?? 0];
    return r?.name as RootRouteName | undefined;
  } catch {
    return undefined;
  }
}

/** Reset to a root route only if it's not already current */
export function resetOnce(name: RootRouteName) {
  whenNavReady(() => {
    if (currentRoot() === name) return;
    navRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name }],
      })
    );
  });
}

// Back-compat helpers
export function resetToAuth()  { resetOnce('Auth'); }
export function resetToMain()  { resetOnce('Main'); }
export function resetToAdmin() { resetOnce('Admin'); }
export function resetToSplash(){ resetOnce('Splash'); }
