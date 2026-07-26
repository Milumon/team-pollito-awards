# Routing navegable y SEO

## Problem Statement

El portal representa la navegación del Panel del Miembro y del Panel de Control mediante estado local dentro de dos páginas monolíticas. Al recargar, abrir un enlace directo o usar Atrás y Adelante, la persona pierde la sección actual y regresa a la vista predeterminada. Las URLs públicas mezclan idiomas, las rutas privadas no conservan el destino durante la autenticación y el sitio carece de una política explícita de canonical, sitemap y exclusión de áreas privadas.

## Solution

Convertir cada sección navegable en una ruta real de Next.js App Router, usando URLs humanas en español y manteniendo estables los contratos técnicos. El Panel del Miembro y el Panel de Control tendrán layouts compartidos, protección de sesión y autorización en servidor, navegación mediante enlaces y soporte para deep links. Las rutas públicas incorporarán metadata, canonical, sitemap y robots. La migración se hará incrementalmente, preservando enlaces históricos mediante redirects hasta alcanzar paridad.

## User Stories

1. Como visitante, quiero abrir una URL pública y recargarla sin perder la página, para poder navegar de forma predecible.
2. Como visitante, quiero encontrar los Premios en `/premios`, para que la URL coincida con el idioma del contenido.
3. Como visitante con un enlace antiguo, quiero que `/awards` me lleve permanentemente a `/premios`, para que mis marcadores sigan funcionando.
4. Como visitante, quiero consultar las clasificaciones en una página propia, para explorar más que el resumen de la landing.
5. Como visitante, quiero compartir una clasificación filtrada, para que otra persona vea la misma métrica y período.
6. Como motor de búsqueda, quiero una única URL canónica de clasificaciones, para no indexar contenido duplicado por filtros.
7. Como Miembro Oficial, quiero entrar al Panel del Miembro por `/panel/inicio`, para comenzar desde un resumen estable.
8. Como usuario de un marcador antiguo de `/console`, quiero continuar llegando a Sonidos, para conservar el comportamiento histórico.
9. Como Miembro Oficial, quiero que Sonidos, Voz, Efectos, Actividad, Perfil, Ajustes y Ayuda tengan URLs propias, para recargar o compartir la ubicación relevante.
10. Como Miembro Oficial, quiero que los subfiltros de una sección se reflejen en parámetros, para conservarlos al recargar sin crear páginas artificiales.
11. Como Miembro Oficial, quiero usar Atrás y Adelante entre secciones, para navegar con los controles normales del navegador.
12. Como Miembro Oficial sin sesión, quiero volver a la URL privada que solicité después de autenticarme, para no perder mi intención.
13. Como Miembro Oficial, quiero que mis borradores y confirmaciones no aparezcan en la URL, para no exponer datos efímeros o sensibles.
14. Como Administrador, quiero entrar por `/admin/inicio`, para comenzar desde el resumen del Panel de Control.
15. Como Administrador, quiero que cada sección del Panel de Control tenga una URL propia, para recargar y enlazar operaciones concretas.
16. Como Administrador, quiero abrir `/admin/usuarios/[userId]` directamente, para editar una persona desde un enlace estable.
17. Como Administrador que navega desde la lista, quiero editar al usuario en un modal contextual, para conservar un flujo rápido sin sacrificar el deep link.
18. Como Miembro Oficial sin rol de Administrador, quiero recibir una página 403 al abrir `/admin/**`, para entender que faltan permisos.
19. Como usuario sin sesión, quiero una ruta de acceso real, para poder autenticarme sin depender de un modal de la landing.
20. Como usuario autenticado, quiero que la autorización ocurra antes de renderizar contenido privado, para evitar parpadeos o exposición accidental.
21. Como operador de OBS, quiero que `/overlay` permanezca estable, para no tener que reconfigurar fuentes de navegador.
22. Como consumidor de la API o de la extensión TikTok, quiero que `/api/**` permanezca estable, para evitar roturas de integración.
23. Como visitante, quiero títulos, descripciones y previews sociales específicos por página pública, para entender y compartir el contenido.
24. Como motor de búsqueda, quiero que sitemap incluya solo páginas públicas canónicas, para descubrir contenido útil.
25. Como motor de búsqueda, quiero que `/panel/**`, `/admin/**`, `/acceso` y rutas técnicas no se indexen, para no publicar superficies privadas o utilitarias.
26. Como equipo, quiero migrar una sección por vez, para desplegar valor y revertir problemas sin un cambio masivo.
27. Como equipo, quiero pruebas de navegador para deep links, recarga, historial y autenticación, para evitar que el defecto original regrese.
28. Como agente implementador, quiero un contrato de rutas cerrado y criterios verificables, para no inventar nombres o comportamientos por issue.

## Implementation Decisions

- Las URLs navegables son un contrato de producto en español; identificadores y módulos internos pueden permanecer en inglés.
- Los contratos técnicos `/api/**` y `/overlay` permanecen en inglés y no cambian.
- Las secciones principales usan segmentos de ruta; filtros, modos y subpestañas usan parámetros públicos en español.
- El estado navegable vive en la URL. Borradores, confirmaciones y formularios sin guardar permanecen como estado local.
- `/panel` redirige a `/panel/inicio`.
- `/console` preserva el comportamiento histórico mediante redirect a `/panel/sonidos` cuando la nueva sección alcance paridad.
- El Panel del Miembro expone Inicio, Clasificaciones, Sonidos, Voz, Efectos, Actividad, Perfil, Ajustes y Ayuda.
- `/admin` redirige a `/admin/inicio`.
- El Panel de Control expone Inicio, Usuarios, Postulaciones, Testimonios, Clasificaciones, Agenda, Nominados, Votos, Transmisión, Overlay, Sonidos, Multimedia y Estado de transmisión.
- La edición de usuario tiene una página real `/admin/usuarios/[userId]` y una presentación modal mediante rutas paralelas/interceptadas al navegar desde la lista.
- `/premios` es canónica y `/awards` aplica redirect permanente.
- `/clasificaciones` es canónica. Los filtros `metrica` y `periodo` aceptan valores en español y se traducen explícitamente a los enums internos.
- Todas las variantes filtradas declaran canonical `/clasificaciones`.
- La landing conserva un Top 10 resumido que enlaza a `/clasificaciones`.
- La sesión de Supabase migra a cookies visibles por el servidor siguiendo el patrón SSR compatible con la versión instalada.
- Next.js 16 `proxy.ts` realiza comprobaciones optimistas y conserva un parámetro `retorno` interno validado.
- Layouts y handlers del servidor aplican autorización real; Proxy no es el único límite de seguridad.
- Usuarios autenticados sin rol de Administrador reciben una vista 403 para `/admin/**`.
- Las rutas privadas y utilitarias se excluyen de indexación mediante metadata y robots.
- `sitemap.ts` enumera exclusivamente rutas públicas canónicas.
- La migración sigue un patrón incremental: cada destino nuevo alcanza paridad y pruebas antes de activar su redirect histórico.
- Las páginas monolíticas se profundizan gradualmente en layouts y módulos por área; no se duplican reglas de autenticación o navegación entre páginas.
- Los issues se ejecutan en ramas y worktrees aislados. Cada implementación pasa por un agente revisor independiente y produce un PR; ningún agente fusiona directamente a `master`.

## Testing Decisions

- Playwright es la seam principal porque prueba el comportamiento externo que originó el trabajo: URL visible, recarga, Atrás/Adelante, deep links, redirects y retorno después de autenticación.
- Cada slice navegable incluye al menos una prueba que entra directamente por URL y otra que navega mediante enlaces.
- Las pruebas privadas usan estados de sesión controlados para distinguir visitante, Miembro Oficial y Administrador.
- La edición de usuario prueba tanto la visita directa como la presentación modal desde la lista, incluida la recarga del deep link.
- Los redirects históricos prueban código de estado y destino final.
- Las pruebas de SEO verifican metadata, canonical, sitemap y reglas de robots mediante respuestas públicas observables.
- El mapeo entre parámetros españoles y enums internos se cubre con pruebas unitarias puras para entradas válidas, ausentes e inválidas.
- Las verificaciones existentes de TypeScript y lint se mantienen. No se corrigen errores históricos ajenos salvo que bloqueen una slice.
- No se prueban nombres de componentes, estado React interno ni estructura de carpetas; se prueba comportamiento visible y contratos HTTP.

## Out of Scope

- Traducir `/api/**`, `/overlay` o contratos consumidos por integraciones.
- Añadir un segundo idioma o prefijos de locale.
- Rediseñar visualmente la landing, el Panel del Miembro o el Panel de Control.
- Cambiar reglas de negocio de Premios, rankings, sonidos, TTS, postulaciones o administración.
- Persistir borradores de formularios al recargar.
- Convertir cada filtro local en una página indexable.
- Fusionar automáticamente PRs generados por agentes.
- Reemplazar Supabase como proveedor de identidad.

## Further Notes

- Contrato arquitectónico registrado en ADR 0013.
- La configuración de Sandcastle usará Docker Desktop y OpenCode con ejecuciones independientes no reanudables.
- Los issues deben publicarse en orden de dependencia y llevar `ready-for-agent`; el PRD no debe ser seleccionado como trabajo de implementación por Sandcastle.
- La concurrencia se limitará por olas para evitar que dos agentes extraigan simultáneamente la misma página monolítica.
