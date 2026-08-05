# ADR-0005: Estado de Minecraft mediante bridge autenticado

## Estado

Aceptada

## Contexto

La web pública necesita mostrar estado y jugadores, pero el servidor Minecraft no debe exponer RCON, SSH ni secretos de GCP. Awards tampoco debe ser una dependencia del gameplay.

## Decision

Un bridge ejecutado junto al servidor enviará un heartbeat HTTPS cada 30 segundos a `/api/minecraft/status` usando un token dedicado. Awards almacenará únicamente el último estado operativo en Supabase y lo marcará como desactualizado después de 90 segundos sin heartbeat.

## Consecuencias

- La web puede mostrar estado sin conectarse directamente al servidor.
- El servidor continúa funcionando si Awards está caído.
- El token del bridge debe gestionarse como secreto y rotarse si se expone.
- El estado público incluye usernames, pero no UUID, IP, coordenadas, inventario ni datos de sesión.
