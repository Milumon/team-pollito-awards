# ADR-0006: Vinculación de Minecraft opcional

## Estado

Aceptada

## Contexto

No todos los Miembros Oficiales juegan Minecraft. La cuenta del portal, Roblox y TikTok deben seguir funcionando sin obligar a entrar al servidor.

## Decision

Minecraft será una vinculación opcional dentro de la sección `/minecraft`. Solo una cuenta Minecraft verificada mediante código y aprobada por un administrador se sincroniza con la whitelist. El estado de Miembro Oficial no concede acceso Minecraft por sí solo.

## Consecuencias

- Los jugadores que no juegan Minecraft no pierden acceso al portal.
- El servidor puede mantener una whitelist basada en identidades verificadas.
- El cambio o revocación de una cuenta requiere una nueva solicitud y queda auditado.
- El bridge conserva la última whitelist válida si Awards está temporalmente caído.
