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

function currentRoot(): string | undefined {
  try {
    const s = navRef.getRootState();
    const r = s?.routes?.[s.index ?? 0];
    return r?.name;
  } catch {
    return undefined;
  }
}

function safeResetTo(name: 'Auth' | 'Main' | 'Admin') {
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

export function resetToAuth()  { safeResetTo('Auth'); }
export function resetToMain()  { safeResetTo('Main'); }
export function resetToAdmin() { safeResetTo('Admin'); }
