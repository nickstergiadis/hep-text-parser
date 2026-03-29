const THEME_STORAGE_KEY = 'theme-preference';
const DEFAULT_THEME_MODE = 'system';
const VALID_MODES = new Set(['light', 'dark', 'system']);

export function getSystemTheme() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(mode) {
  if (mode === 'light' || mode === 'dark') return mode;
  return getSystemTheme();
}

export function readStoredThemeMode() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return VALID_MODES.has(stored) ? stored : DEFAULT_THEME_MODE;
  } catch {
    return DEFAULT_THEME_MODE;
  }
}

export function persistThemeMode(mode) {
  if (!VALID_MODES.has(mode)) return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // no-op in restricted contexts
  }
}

export function applyThemeToDocument(mode) {
  if (typeof document === 'undefined') return resolveTheme(mode);
  const safeMode = VALID_MODES.has(mode) ? mode : DEFAULT_THEME_MODE;
  const resolvedTheme = resolveTheme(safeMode);
  document.documentElement.dataset.themeMode = safeMode;
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
  return resolvedTheme;
}

export function initTheme({ controlElement } = {}) {
  let themeMode = readStoredThemeMode();
  let mediaQuery = null;

  const syncTheme = () => {
    applyThemeToDocument(themeMode);
    if (controlElement) controlElement.value = themeMode;
  };

  const handleSystemThemeChange = () => {
    if (themeMode === 'system') syncTheme();
  };

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleSystemThemeChange);
    }
  }

  syncTheme();

  if (controlElement) {
    controlElement.addEventListener('change', event => {
      const nextMode = event.target.value;
      if (!VALID_MODES.has(nextMode)) return;
      themeMode = nextMode;
      persistThemeMode(themeMode);
      syncTheme();
    });
  }

  return {
    getThemeMode: () => themeMode,
    getResolvedTheme: () => resolveTheme(themeMode)
  };
}
