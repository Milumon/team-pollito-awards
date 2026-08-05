# Alex's Mobs y Pale Garden

Fecha de consulta: 2026-08-05

## Resumen ejecutivo

- **Alex's Mobs** es un mod de Minecraft Java que agrega mas de 80 criaturas, items y mecanicas. Sus distribuciones oficiales consultadas son para **Forge o NeoForge**, no para Paper. La version estable mas reciente publicada para la rama 1.20 es `alexsmobs-1.22.9`, para Minecraft 1.20.1 y Forge; requiere la libreria **Citadel** compatible con la misma version de Minecraft y loader.
- No debe instalarse Alex's Mobs en el servidor Paper del proyecto: Paper carga plugins Bukkit/Paper, mientras que Alex's Mobs es un mod Forge/NeoForge. Un servidor hibrido no cambia esa conclusion operativa y no es una ruta soportada por las fuentes del mod.
- Geyser permite que clientes Bedrock entren a servidores Java/Paper, pero su FAQ dice que no puede traducir las funcionalidades que agregan la mayoria de mods y que los servidores que requieren mods en el cliente no son soportables. Alex's Mobs, por tanto, no es compatible con una experiencia Bedrock via Geyser.
- **Pale Garden** es un bioma vanilla del Overworld, variante de Dark Forest. Llego a Java en la version 1.21.4 y a Bedrock en la linea 1.21.50. Sus bloques, el Creaking y sus mecanicas son contenido del juego base, no un mod.
- El Paper del proyecto aun no tiene una version fijada ni esta instalado: el script solo prepara Java 21 y deja indicado que la instalacion de Paper esta pendiente. Pale Garden sera utilizable en Paper cuando se elija una version de Minecraft/Paper que incluya la funcionalidad vanilla correspondiente, como 1.21.4 o posterior en Java; no se debe asumir una version concreta hasta fijarla.

## Alex's Mobs

### Que es y que agrega

El proyecto se describe como un mod que agrega 85+ criaturas. Incluye animales reales y criaturas fantasticas, con drops, items, comportamiento y funciones propias; tambien entrega el **Animal Dictionary** como guia dentro del juego. El proyecto afirma que puede convivir con otros mods de bloques, mobs, biomas y dimensiones y que los spawns son configurables por bioma, dimension y etiquetas.

Fuentes del proyecto: [Modrinth](https://modrinth.com/mod/alexs-mobs), [CurseForge](https://www.curseforge.com/minecraft/mc-mods/alexs-mobs), [repositorio fuente](https://github.com/AlexModGuy/AlexsMobs).

### Version y dependencias

La ficha de CurseForge consultada publica como archivo principal de la rama moderna `alexsmobs-1.22.9`, para **Minecraft 1.20.1**, con **Forge**. La ficha de Modrinth enumera compatibilidad con Minecraft Java 1.20.1, 1.19.4, 1.19.2, 1.19, 1.18.2 y 1.16.5, y solo los loaders Forge y NeoForge. Las fichas indican que el mod funciona en cliente y servidor.

La pagina de CurseForge marca expresamente que el mod **requiere Citadel**. Citadel es una libreria para animaciones avanzadas y propiedades de entidades; su ficha enumera Forge/NeoForge y publica para 1.20.1 el archivo `citadel-2.6.3-1.20.1`. La version exacta de Citadel debe corresponder al Minecraft y loader elegidos, no se debe mezclar con la de otra rama.

Fuentes: [Alex's Mobs en CurseForge](https://www.curseforge.com/minecraft/mc-mods/alexs-mobs), [Citadel en CurseForge](https://www.curseforge.com/minecraft/mc-mods/citadel), [Citadel en Modrinth](https://modrinth.com/mod/citadel), [codigo fuente de Citadel](https://github.com/AlexModGuy/Citadel).

### Compatibilidad con Paper

**Resultado: no compatible como instalacion Paper soportada.**

La evidencia directa es que Alex's Mobs se distribuye como mod Forge/NeoForge y su dependencia Citadel tambien. Paper se define oficialmente como un servidor de Minecraft Java Edition orientado a plugins y ofrece documentacion separada para Paper plugins. No existe en las fichas consultadas una version Bukkit/Paper del mod.

Por ello, copiar los `.jar` de Alex's Mobs o Citadel en `plugins/` no es una instalacion valida. Para usar el mod habria que cambiar la plataforma del servidor a un loader de mods y hacer que los clientes Java instalen el mod y sus dependencias. Eso contradice el MVP del proyecto, que decide Paper sin mods obligatorios en el cliente.

Fuentes: [Paper Docs](https://docs.papermc.io/paper/), [Paper: Adding plugins](https://docs.papermc.io/paper/adding-plugins/), [Alex's Mobs en Modrinth](https://modrinth.com/mod/alexs-mobs), [Alex's Mobs en CurseForge](https://www.curseforge.com/minecraft/mc-mods/alexs-mobs).

### Compatibilidad con Geyser y Bedrock

Geyser es un traductor entre Bedrock y Java: emula un cliente Java y permite que Bedrock entre a un servidor Java, incluyendo Paper mediante Geyser-Spigot. La documentacion de Geyser tambien establece dos limites relevantes:

- Geyser funciona si el servidor soporta la version vanilla Java que necesita el traductor.
- Actualmente no puede traducir la mayoria de bloques, items y funcionalidades agregadas por mods; los servidores que requieren mods instalados en el cliente no son soportables mediante Geyser.

Alex's Mobs agrega entidades, items, modelos, comportamiento y mecanicas propias, y requiere un mod en el cliente Java. Por tanto, no hay una ruta soportada para que jugadores Bedrock vean y usen Alex's Mobs a traves de Geyser. Geyser puede servir para un Paper vanilla, pero no convierte Alex's Mobs en contenido Bedrock.

La pagina de versiones de Geyser consultada indica actualmente soporte para Bedrock 26.0-26.40 y Java 26.2, y que Geyser-Spigot requiere Paper/Spigot 1.20.5 o posterior y Java 21 o posterior. Estos datos son del estado de Geyser al momento de la consulta y no sustituyen fijar versiones compatibles para el servidor.

Fuentes: [Geyser FAQ](https://geysermc.org/wiki/geyser/faq/), [Geyser supported versions](https://geysermc.org/wiki/geyser/supported-versions/), [Geyser overview](https://geysermc.org/wiki/geyser/).

### Impacto operativo

Instalarlo como mod implicaria una plataforma distinta, un paquete de mods sincronizado entre servidor y clientes Java, pruebas de generacion y de persistencia de entidades/items, y una superficie adicional de mantenimiento. El mod suma muchas entidades con IA, spawns, animaciones y mecanicas, por lo que la carga real dependeria de chunks cargados, jugadores y cantidad de mobs; las fichas del proyecto no prometen un coste fijo de CPU o RAM.

Para este servidor, el coste mas importante es de compatibilidad y soporte: se perderia el modelo Paper sin mods obligatorios, se complicaria la entrada Bedrock y se ampliaria el proceso de backups, actualizaciones y pruebas. No es una opcion adecuada para el MVP actual.

## Pale Garden / Pale Forest vanilla

### Versiones y naturaleza

El nombre oficial del bioma es **Pale Garden**. Es una variante de **Dark Forest** del Overworld. El anuncio oficial lo presenta como un bioma nuevo con pale oak, hanging moss y el Creaking; las notas de Java 1.21.4 lo incorporan como parte de *The Garden Awakens*.

Versiones de lanzamiento:

- **Java Edition:** 1.21.4, publicada el 3 de diciembre de 2024.
- **Bedrock Edition:** la funcionalidad se introdujo en la serie 1.21.50, primero en preview y despues en la version estable de esa linea.

El termino “Pale Forest” puede aparecer como nombre informal o traduccion, pero el identificador vanilla documentado es `pale_garden`; no es un segundo bioma independiente en estas fuentes.

Fuentes: [The Pale Garden, Minecraft.net](https://www.minecraft.net/en-us/article/the-pale-garden), [Minecraft Java Edition 1.21.4, Minecraft.net](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-4), [pagina oficial de descargas Java](https://www.minecraft.net/en-us/download/server), [pagina oficial de descargas Bedrock](https://www.minecraft.net/en-us/download/server/bedrock).

### Mobs y reglas relevantes

- Los animales no aparecen naturalmente en Pale Garden.
- El Creaking es el mob hostil caracteristico. Puede parecer un arbol, se queda inmovil cuando un jugador lo mira y se mueve cuando deja de estar en su campo de vision.
- El Creaking vinculado a un **Creaking Heart** no se derrota atacandolo directamente. Hay que localizar y romper el corazon que lo genero; al destruirlo, el Creaking muere.
- Los Creaking Hearts pueden generarse dentro de pale oak y activan Creakings durante la noche.
- La ausencia de animales no significa ausencia de enemigos vanilla: las notas oficiales muestran, por ejemplo, creepers y endermen en el bioma; la cobertura exacta de spawns depende de la version y de las reglas vanilla.

La mecanica de mirar al Creaking es especialmente relevante para pruebas: afecta combate, exploracion nocturna, visibilidad, carga de entidades y posibles granjas o zonas de construccion. El corazon es un bloque funcional, no solo decorativo.

Fuente: [Minecraft Java Edition 1.21.4](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-4).

### Bloques y mecanicas de construccion

El contenido vanilla relevante incluye:

- **Pale Oak** y su conjunto de madera: troncos, tablones, escaleras, losas, puertas, trampillas, vallas, puertas de valla, botones, placas de presion, carteles, carteles colgantes, barcos y barcos con cofre.
- **Pale Moss Block** y **Pale Moss Carpet**, que aparecen en el suelo; el carpet puede crecer sobre caras solidas adyacentes y expandirse con polvo de hueso.
- **Pale Hanging Moss**, una enredadera colgante que no crece aleatoriamente, pero puede crecer con polvo de hueso; para obtenerla se requieren tijeras o Silk Touch.
- **Eyeblossoms**, con variantes cerrada y abierta que cambian segun el momento del dia.
- **Creaking Heart**, que vincula y controla el Creaking.
- **Resin** y la familia de bloques de resin, obtenidos a partir de la interaccion con el Creaking y utiles para construccion y decoracion.
- El bioma no tiene musica ambiental propia; si ya estaba sonando musica, se desvanece al entrar.

Fuente: [notas oficiales de Java 1.21.4](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-4).

## Compatibilidad con el Paper del proyecto

### Estado que existe ahora

El repositorio `servidor-minecraft` no fija todavia el numero de version de Paper ni contiene una instalacion de Paper. El script de provision instala Java 21, prepara `paper.jar` como ruta de arranque y deja escrito que la instalacion de Paper sigue pendiente. El plan solo dice que se usara Paper con una version fijada y actualizada de forma controlada.

Fuente local: [`ops/gcp/minecraft-startup.sh`](../../../servidor-minecraft/ops/gcp/minecraft-startup.sh) y [`PLAN_SERVIDOR_TEAM_POLLITO.md`](../../../servidor-minecraft/PLAN_SERVIDOR_TEAM_POLLITO.md); son referencias del workspace, no fuentes externas del dato vanilla.

### Conclusion tecnica

- Pale Garden es contenido del servidor vanilla, asi que **si puede usarse en Paper** cuando el Paper elegido corresponde a una version que lo incluye. Para Java, el umbral practico es Paper basado en Minecraft 1.21.4 o posterior; en una version anterior el bioma, sus bloques y el Creaking no existen vanilla.
- No requiere mod del cliente. Esto encaja con el MVP Paper sin mods obligatorios y deja abierta la posibilidad de clientes Bedrock mediante Geyser, sujeto a la matriz de versiones y a las limitaciones normales de traduccion.
- Al actualizar a una version compatible, hay que probar en un mundo de staging la generacion de chunks nuevos, el spawn nocturno del Creaking, la ruptura del Creaking Heart, Eyeblossoms, resin, conversion de bloques y el comportamiento con plugins de proteccion y pregeneracion.
- Los chunks ya generados no se convierten automaticamente en Pale Gardens por actualizar Paper; la exploracion y generacion del bioma ocurre en territorio nuevo conforme a la semilla y version. Cualquier cambio de version debe seguir el procedimiento de backup del proyecto.
- Alex's Mobs y Pale Garden no son intercambiables: Pale Garden es vanilla/Paper; Alex's Mobs requiere una plataforma de mods y no debe añadirse al Paper actual.

## Fuentes primarias consultadas

- [Alex's Mobs en Modrinth](https://modrinth.com/mod/alexs-mobs)
- [Alex's Mobs en CurseForge](https://www.curseforge.com/minecraft/mc-mods/alexs-mobs)
- [Repositorio de Alex's Mobs en GitHub](https://github.com/AlexModGuy/AlexsMobs)
- [Citadel en CurseForge](https://www.curseforge.com/minecraft/mc-mods/citadel)
- [Citadel en Modrinth](https://modrinth.com/mod/citadel)
- [Repositorio de Citadel en GitHub](https://github.com/AlexModGuy/Citadel)
- [Paper Documentation](https://docs.papermc.io/paper/)
- [Geyser FAQ](https://geysermc.org/wiki/geyser/faq/)
- [Geyser Supported Versions](https://geysermc.org/wiki/geyser/supported-versions/)
- [The Pale Garden, Minecraft.net](https://www.minecraft.net/en-us/article/the-pale-garden)
- [Minecraft Java Edition 1.21.4, Minecraft.net](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-4)
