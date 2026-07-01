# Progressive Web App (PWA) estándar sin notificaciones Push nativas

Decidimos estructurar la aplicación móvil como una Progressive Web App (PWA) estándar para permitir su instalación en la pantalla de inicio de los dispositivos (iOS y Android), pero excluyendo las notificaciones Push globales del sistema operativo. Esto acelera el desarrollo inicial y simplifica el despliegue al evitar la infraestructura necesaria para APNs (Apple) y Firebase Cloud Messaging, resolviendo la comunicación de estado en vivo directamente de forma in-app.

## Considered Options

- **Desarrollo de App Mobile Nativa (React Native / Flutter)**: Ofrece la mejor experiencia y push notifications, pero se rechazó porque incrementa enormemente los costos, requiere mantener múltiples codebases y demoraría meses el lanzamiento.
- **PWA Completa con Web Push**: Ofrecía notificaciones pero se descartó temporalmente debido a la complejidad de configuración de Service Workers en Safari/iOS y la necesidad de mantener un servidor de suscripciones.
- **PWA Estándar (Elegida)**: Ofrece instalabilidad a pantalla completa, ícono personalizado en el celular y almacenamiento en caché de audios del soundboard a través del Service Worker, resolviendo las alertas visuales y auditivas dentro de la aplicación.
