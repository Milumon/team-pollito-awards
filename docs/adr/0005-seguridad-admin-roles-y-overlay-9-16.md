# ADR 0005: Seguridad del Panel Admin por Supabase Auth y Adaptación del Overlay a 9:16

* **Estatus:** Aceptado
* **Fecha:** 2026-06-30
* **Autor:** Antigravity (AI Architect)

---

## Contexto

Originalmente, el Panel de Administración (`/admin`) requería la inserción de un token manual (`ADMIN_PANEL_TOKEN`) para habilitar el ingreso y autorizar las llamadas API mediante el header `x-admin-token`. Esto resulta engorroso para el administrador creador y carece de integración con la base de datos de usuarios de Supabase Auth.

Por otro lado, el overlay del stream (`/overlay`) está diseñado para toda la pantalla (`w-screen h-screen`), lo cual causa que las alertas y la caída de partículas (lluvia de huevos, etc.) se dispersen por toda la pantalla horizontal cuando se transmite en plataformas móviles como TikTok Live (formato 9:16).

---

## Decisiones

### 1. Eliminación de Token del Panel y Adopción de Supabase Auth con Roles
*   Se elimina la solicitud de token en la interfaz de administración. En su lugar, el panel lee de manera directa la sesión actual del cliente de Supabase.
*   Se introduce una columna `is_admin` en la tabla `public.profiles`.
*   El usuario con el email `kpopxfull@gmail.com` es catalogado en el código como el Administrador/Owner inmutable y tiene privilegios de administración automáticos.
*   Cualquier administrador registrado puede otorgar o revocar permisos de administración a otros usuarios desde el panel de control, siempre y cuando estos usuarios ya tengan sus perfiles vinculados en la tabla `profiles`.
*   El token histórico (`ADMIN_PANEL_TOKEN`) se mantendrá activo únicamente como clave de transmisión para que OBS Studio pueda renderizar el overlay de forma remota sin requerir autenticación interactiva.

### 2. Contención y Adaptación Vertical 9:16 del Overlay
*   El overlay del stream se restringe a un contenedor central con proporción fija de `9:16` (`aspect-[9/16] h-full mx-auto`).
*   Las animaciones de caída de partículas se limitan a este marco vertical.
*   El widget de alertas de eventos se desplaza al centro superior de la pantalla para evitar colisionar con los widgets de TikTok Live (como el chat o botones de interacción).

---

## Consecuencias

*   **Seguridad y Auditoría:** Los endpoints administrativos destructivos y mutables quedan resguardados tras el JWT del usuario de Supabase Auth. Ya no se comparten tokens administrativos genéricos.
*   **Facilidad de Uso:** El creador ingresa directamente a su panel admin de manera transparente al iniciar sesión en el portal.
*   **Estética del Stream:** El overlay conserva sus proporciones correctas en TikTok Live incluso si la fuente del navegador en OBS se configura en resolución horizontal estándar.
