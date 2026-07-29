type CookieName = {
  name: string;
  value?: string;
};

export function hasSupabaseAuthCookie(cookies: CookieName[], supabaseUrl: string) {
  try {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
    const storageKey = `sb-${projectRef}-auth-token`;

    return cookies.some(({ name }) => {
      if (name === storageKey) {
        return true;
      }

      const chunk = name.slice(storageKey.length + 1);
      return name.startsWith(`${storageKey}.`) && /^\d+$/.test(chunk);
    });
  } catch {
    return false;
  }
}
