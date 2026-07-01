# ADR 0003: Diseño Visual y Lógica de Interacción de la Consola VIP

## Estado
Aceptado

## Contexto
La Consola VIP para miembros de la comunidad requiere una reestructuración de diseño e interactividad para alinearse con un mockup oscuro de alta fidelidad que simula herramientas profesionales de transmisión en vivo (como Discord, OBS Studio y Stream Deck). A diferencia del neo-brutalismo brillante de la landing page, la consola debe transmitir rapidez, precisión técnica y control instantáneo en vivo.

Se analizaron tradeoffs sobre navegación móvil, sincronización de cooldowns, visualización de métricas y preescucha local de efectos de sonido.

## Decisiones

### 1. Paleta de Colores y Tipografías Técnicas
*   **Colores:** Fondo oscuro `#0F1115`, tarjetas `#181A20`, acentos amarillos y naranjas `#FFD400`/`#FF9D00`.
*   **Bordes y Sombras:** Bordes finos de 2px de color `#2D2D2D` y sombras difuminadas sutiles (`box-shadow: 0 8px 20px rgba(0,0,0,.25)`).
*   **Tipografía:** `Space Grotesk` para títulos, `Inter` para datos e `JetBrains Mono` para contadores y números de consola. Cargadas de forma nativa mediante `next/font/google`.

### 2. Navegación e Interacción de Paneles
*   La barra lateral izquierda de navegación controla el panel central. Al hacer clic en una sección como `Nickname`, el área central se convierte en su panel de administración completo.
*   El panel lateral derecho permanece fijo y visible en pantallas grandes como accesos rápidos (perfil, mutes en vivo, estado de sincronización).

### 3. Cooldown Dual (Personal vs. Global)
*   **Cooldown Personal:** Se calcula localmente por usuario. Muestra de forma descendente un cronómetro y una barra de progreso de color naranja en el botón del sonido presionado.
*   **Cooldown Global:** Cuando cualquier miembro VIP activa un sonido, la base de datos a través de Supabase Realtime envía un bloqueo temporal para todos los usuarios (ej: 3 a 5 segundos) previniendo que los audios se pisen en el stream.

### 4. Responsividad Híbrida en Móviles
*   En pantallas móviles (< 1024px), se habilita una barra de navegación inferior fija (`Bottom Navigation Bar`) con iconos de acceso rápido para las pestañas de acción principal (`Sonidos`, `TTS`, `Efectos`).
*   Se incluye una pestaña "Más" o botón de hamburguesa en el encabezado superior para desplegar de forma lateral (Drawer) el menú lateral izquierdo con las opciones avanzadas y de perfil.

### 5. Modo de Prueba Local (Toggle)
*   El botón `▶ Probar sonido` actúa como un interruptor. Al encenderse, los clics en los botones de sonido se desvían de Supabase Realtime y se reproducen localmente a través de la API del navegador del usuario sin disparar cooldowns ni alterar el directo.

## Consecuencias
*   **Positivas:** Interfaz de usuario mucho más fluida, técnica y optimizada para su uso simultáneo mientras se reproduce stream o se juega. Se evita la saturación de sonido en vivo gracias al cooldown global.
*   **Negativas:** Mayor complejidad en el estado local de React para gestionar el modo de prueba y la sincronización de múltiples contadores de cooldown.
