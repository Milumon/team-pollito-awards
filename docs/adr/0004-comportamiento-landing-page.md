# Comportamiento y Estructura Unificada de la Landing Page

Decidimos que la página principal (`/`) se mantenga como una landing page pública uniforme para todos los usuarios (invitados, candidatos y miembros oficiales). En lugar de reemplazar toda la interfaz para los usuarios aprobados (VIP), se integra un flujo híbrido donde el contenido base (reglas, miembros, estadísticas) es compartido y solo varían dinámicamente el encabezado de perfil y el bloque de admisión lateral derecho.

## Considered Options

- **Redirección automática a /console**: Redirigir de inmediato a los Miembros Oficiales a `/console` al entrar a `/`. Se rechazó porque priva a los miembros de ver las estadísticas actualizadas de la comunidad, las reglas generales y la lista completa de miembros oficiales.
- **Vistas completamente distintas**: Mostrar una landing page para invitados y una consola VIP completa al ingresar a `/`. Se rechazó porque duplica la lógica de renderizado y rompe la consistencia de navegación de la landing principal.
- **Estructura Híbrida Compartida (Elegida)**: Mantener la landing page uniforme y cambiar únicamente la sección de Admisión por el bloque de Perfil/Consola VIP para usuarios aprobados, y el selector de entrevistas por un calendario mensual dinámico interactivo para candidatos.
