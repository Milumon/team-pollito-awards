# ADR 0007: Neobrutalismo Oscuro Unificado (Design System & DNA)

## Contexto y Problema

Las tres secciones del portal (Landing, Consola VIP y Panel de Administración) presentaban diferencias significativas de identidad visual (Design DNA). El Landing utilizaba un neobrutalismo blanco y alegre; la Consola VIP se asemeja a una interfaz gamer (Discord/Steam); y el Panel de Administración se comportaba como un SaaS moderno clásico corporativo (tipo Linear/Vercel). 

Esto rompía la coherencia de marca, pareciendo tres productos distintos. Decidimos adoptar el lenguaje del Landing (Neobrutalismo alegre, amarillo de alto contraste, bordes gruesos, sombras de offset duras) pero adaptado a una escala oscura premium integrada.

## Decisiones de Diseño (Design DNA)

### 1. Tipografías Oficiales
*   **Títulos principales y llamados a la acción (CTA):** Familia **Anton** (ya integrada en el proyecto mediante `@fontsource/anton`). Siempre en mayúsculas, peso exagerado, tracking condensado. Clase recomendada: `font-display uppercase`.
*   **Texto de lectura y etiquetas:** Familia **Inter** (ya configurada como `font-sans`). Sin mezclar con otras tipografías.
*   **Datos y bitácoras técnicas:** Familia **JetBrains Mono** (`font-mono`).

### 2. Paleta de Colores
*   **Amarillo Oficial de Marca:** Únicamente `#FFD500` (se descartan variaciones como `#FFD700`, `#FFD400`, etc.). Utilizado para botones primarios, iconos activos, insignias de rango VIP, contadores e información clave.
*   **Fondo y Superficies (Escala Oscura):**
    *   `Dark 0` (Fondo de página): `#0E1014`
    *   `Dark 1` (Tarjetas y paneles secundarios): `#16181D`
    *   `Dark 2` (Contenedores empotrados, inputs, bitácora): `#20232A`
    *   `Dark 3` (Estados hover, botones secundarios activos): `#2B2F37`
*   **Escala de Alertas:** Verde (Éxito), Rojo (Peligro/Mudo), Azul/Púrpura (Estados neutros o de información).

### 3. Sistema de Bordes y Sombras
*   **Bordes:** Borde negro de 3px (`border-3 border-black`) en todos los paneles, tarjetas y botones interactivos.
*   **Radio de Bordes (Rounded):** Radio unificado de 16px–18px (`rounded-2xl`).
*   **Sombras Duras (Efecto Sticker):**
    *   **Modo Claro (Landing):** Sombras sólidas en negro puro (`shadow-[6px_6px_0_0_#000]`).
    *   **Modo Oscuro (Consola VIP y Panel de Control):** Sombras sólidas de acento en amarillo oficial (`shadow-[6px_6px_0_0_#FFD500]`) para resolver la visibilidad y el contraste contra los fondos oscuros.

### 4. Iconografía y Emojis
*   Los emojis quedan reservados estrictamente para elementos contextuales de la comunidad (premios 🏆, pollitos 🐥, robux 🎁).
*   Toda la navegación, botones y acciones de interfaz deben utilizar iconos de **Lucide**.

### 5. Botones y Comportamiento Interactivo
*   **Botón Primario:** Fondo `#FFD500`, texto negro, borde de 3px negro, sombra de 3px-4px.
*   **Botón Secundario:** Fondo `Dark 1` (#16181D) o `Dark 2` (#20232A), texto blanco, borde de 3px negro.
*   **Botón de Peligro (Danger):** Fondo rojo vibrante (`#ef4444`), texto blanco, borde de 3px negro.
*   **Efecto Físico (Tap/Pulsado):** Desplazamiento en el eje de la sombra mediante `active:translate-y-[3px] active:shadow-none` y remoción de sombra en estado bloqueado (`disabled:shadow-none disabled:translate-y-0`).

### 6. Chips de Estado Unificados
Se unifican los colores y etiquetas de estado en chips rectangulares de bordes negros:
*   `🟢 ACTIVO` o `🟢 APROBADO`
*   `🔴 INACTIVO` o `🔴 RECHAZADO`
*   `🟡 PENDIENTE`
*   `🔵 SINCRONIZADO`
*   `🟣 VIP` o `🟣 ADMIN`

## Consecuencias

*   **Coherencia Visual:** El usuario sentirá que navega dentro del mismo ecosistema del Team Pollito, unificando la estética de la comunidad y del administrador.
*   **Mantenimiento del Código:** Se reducen las clases ad-hoc en Tailwind. Toda tarjeta y botón seguirá las mismas variables.
*   **Contraste y UX:** El uso de sombras amarillas en modo oscuro soluciona el problema de legibilidad del neobrutalismo oscuro clásico.
