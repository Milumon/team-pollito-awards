const DEFAULT_RETURN_PATH = '/';

export function normalizeReturnPath(
  value: string | null | undefined,
  fallback = DEFAULT_RETURN_PATH,
) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  try {
    const url = new URL(value, 'http://team-pollito.local');
    if (url.origin !== 'http://team-pollito.local') {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function buildAccessPath(returnPath: string | null | undefined) {
  const normalized = normalizeReturnPath(returnPath);
  return `/acceso?retorno=${encodeURIComponent(normalized)}`;
}
