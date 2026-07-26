---
status: accepted
---

# Routing navegable en español

Las secciones navegables usarán Next.js App Router con la URL como fuente de verdad. Las URLs dirigidas a personas estarán en español, mientras que los contratos técnicos existentes (`/api/**` y `/overlay`) permanecerán en inglés para no romper integraciones.

El Panel del Miembro vivirá bajo `/panel/**` y el Panel de Control bajo `/admin/**`. Cada sección principal tendrá una ruta; los filtros y modos locales usarán parámetros en español. Los borradores y confirmaciones permanecerán como estado efímero. La edición de usuarios tendrá una ruta real `/admin/usuarios/[userId]`, interceptada como modal al navegar desde la lista.

Las rutas públicas canónicas serán `/premios` y `/clasificaciones`. `/awards` redirigirá permanentemente a `/premios`; `/console` preservará su comportamiento histórico redirigiendo a `/panel/sonidos`. Los filtros de clasificaciones serán compartibles, pero declararán `/clasificaciones` como único canonical.

Las sesiones de Supabase migrarán a cookies visibles por el servidor. Next.js Proxy realizará redirects optimistas hacia `/acceso?retorno=...`, mientras que layouts y handlers del servidor aplicarán la autorización real. Un usuario autenticado sin rol de Administrador recibirá una respuesta 403 al acceder a `/admin/**`.

La migración será incremental. Las rutas antiguas seguirán operativas hasta que su destino alcance paridad y Playwright verifique deep links, recarga, historial y retorno tras autenticación.
