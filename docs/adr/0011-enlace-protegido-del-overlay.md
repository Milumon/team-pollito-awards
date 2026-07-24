# ADR 0011: Enlace protegido del overlay

* **Estatus:** Aceptado
* **Fecha:** 2026-07-24

## Contexto

El overlay de OBS reutilizaba `ADMIN_PANEL_TOKEN` en su URL. Esa clave también era aceptada por endpoints administrativos, y el enlace debía construirse manualmente fuera del panel.

El overlay no es solo una vista: registra su heartbeat y marca eventos como reproducidos. Dejar esas operaciones públicas permitiría que otra instancia consumiera eventos antes que OBS.

## Decisión

* El overlay usará una clave exclusiva `OVERLAY_TOKEN`, sin permisos administrativos.
* El panel autenticado con Supabase mostrará el enlace completo y permitirá copiarlo o abrirlo.
* El usuario no tendrá que escribir ni ensamblar una contraseña manualmente.
* Los endpoints de heartbeat y consumo de eventos aceptarán únicamente la credencial del overlay.

## Consecuencias

* El enlace de OBS sigue protegido, pero su configuración se reduce a copiar y pegar.
* `ADMIN_PANEL_TOKEN` deja de estar expuesto en la URL del overlay.
* `OVERLAY_TOKEN` debe configurarse en el servidor y tratarse como secreto.
