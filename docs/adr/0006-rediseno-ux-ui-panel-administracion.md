# ADR 0006: Rediseño UX/UI del Panel de Administración

* **Estatus:** Aceptado
* **Fecha:** 2026-06-30
* **Autor:** Antigravity (AI Architect)

---

## Contexto

El Panel de Administración original utilizaba un diseño neobrutalista amarillo brillante consistente con la landing page, pero con una alta carga cognitiva debido a la densidad de información y la falta de jerarquía (CMS, analíticas, moderación y control de stream mezclados en pestañas planas). 

Para mejorar la eficiencia del flujo de trabajo de los administradores y moderadores, se plantea una reestructuración del panel bajo un diseño técnico oscuro inspirado en herramientas como Vercel y Supabase Studio.

---

## Decisiones

### 1. Migración Estética y Homogeneidad Visual
*   Se adopta una paleta de colores oscura: Fondo principal `#0F1115`, tarjetas `#171A20`, barra lateral `#111318` y acentos amarillos `#FFD400`.
*   Se reducen los bordes gruesos a líneas finas técnicas de `2px` con color `#2D2D2D`.
*   Se utilizan fuentes tipográficas dedicadas: `Space Grotesk` para títulos, `Inter` para cuerpos de texto, y `JetBrains Mono` para datos técnicos, marcas de tiempo e identificadores.

### 2. Estructuración en Tres Módulos Clave
El panel se organiza en la barra lateral bajo tres responsabilidades claras:
1.  **Comunidad:** Dashboard general (Overview), Usuarios y Permisos, y Postulaciones de acceso VIP.
2.  **Pollitos Awards:** Gestión de Nominados y Recuento de Votos en tiempo real.
3.  **Stream:** Control de Directo (botón de pánico y cooldowns) y Banco de Sonidos.

### 3. Persistencia de Logs de Auditoría y Trazabilidad
*   Se crea la tabla `public.admin_audit_logs` en Supabase.
*   Toda acción administrativa de modificación o borrado registrará un log asincrónico (Acción, Admin Email, Timestamp) para alimentar la columna derecha de **Actividad Reciente**.

### 4. Monitorización de Conectividad en Tiempo Real
*   El indicador de la VM de Alexa Roblox se alimenta de pings directos del backend a `ROBLOX_ALEXA_VM_URL`.
*   El indicador de OBS se alimenta de un pulso de presencia (heartbeat) de 15 segundos del overlay de OBS almacenado en `stream_settings.overlay_active_at`.

### 5. Navegación Libre de Modales
*   La visualización y edición detallada de elementos (ver planillas de votos de usuarios, editar nominados, motivo de rechazo de postulaciones) se realizará mediante **Drawers laterales** en lugar de modales flotantes, manteniendo siempre visible la tabla de datos principal.
*   El botón "Ver Perfil" de las postulaciones redirigirá al perfil oficial de Roblox (`roblox.com/users/{id}/profile`) para verificar la cuenta.

---

## Consecuencias

*   **Reducción del estrés del operador:** Las secciones dedicadas permiten separar las tareas de moderación antes del stream del control de pánico durante el directo.
*   **Mejor desempeño de carga:** El uso de tablas de datos paginadas en lugar de grillas masivas de tarjetas optimiza los renderizados del cliente.
*   **Seguridad auditable:** El creador principal posee trazabilidad de qué moderador realizó cada cambio en la plataforma.
