# Protección Anti-Spam mediante modal en la consola de miembro

Reemplazamos el diálogo nativo `window.confirm` por un modal interactivo y animado de React en la Consola de Miembro. Esto asegura la consistencia con el Diseño Neobrutalista Oscuro Unificado de la plataforma. Para optimizar la experiencia de usuario, el modal incluye una opción rápida de "No volver a preguntar" que deshabilita permanentemente el diálogo y persiste esta preferencia en el `localStorage` del navegador.

## Considered Options

**Opción descartada — Mantener confirmaciones nativas del navegador:**
Aunque no requiere estado adicional en React, los diálogos nativos interrumpen la experiencia del usuario, no se adaptan al diseño oscuro y no permiten integrar un flujo de "No volver a preguntar" directamente en la misma interacción.

## Consequences

- La función `triggerEvent` ahora puede pausar la ejecución y almacenar un trigger pendiente en el estado `pendingTrigger`.
- El usuario puede deshabilitar esta protección en el propio modal (mediante un checkbox de confirmación rápida) o bien en la sección de Ajustes de la consola.
- La preferencia del usuario se persiste localmente en el dispositivo usando `localStorage.setItem('confirmSpamGuard', 'false')`.
