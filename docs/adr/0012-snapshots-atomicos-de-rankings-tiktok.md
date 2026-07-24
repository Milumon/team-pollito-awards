# ADR 0012: Snapshots atómicos de Rankings TikTok

* **Estatus:** Aceptado
* **Fecha:** 2026-07-24

## Contexto

TikTok LIVE Center expone clasificaciones de espectadores y regalos para cuatro períodos. Cada combinación se obtiene por separado, pero el portal debe presentarlas como una captura coherente. Publicar respuestas a medida que llegan mezclaría ventanas temporales y dejaría rankings parciales cuando TikTok rechaza una solicitud.

También se necesita conservar actividad histórica y recuperar una publicación anterior sin destruir datos importados.

## Decisión

* Una importación válida contiene exactamente ocho combinaciones: espectadores y regalos para último live, 7, 28 y 60 días.
* El Batch de Rankings se valida y persiste en una sola transacción antes de volverse visible.
* Batches, snapshots y entries son inmutables.
* La visibilidad se representa mediante una Activación de Ranking append-only.
* Un rollback crea una nueva activación que señala un batch anterior; nunca sobrescribe snapshots.
* El ID estable de TikTok y los valores se almacenan y transportan como texto decimal.
* `display_id` es metadata mutable y se usa únicamente para proponer el vínculo inicial con un Miembro Oficial.

## Consecuencias

* Los lectores siempre observan ocho clasificaciones provenientes del mismo batch.
* Un fallo parcial conserva completa la publicación anterior.
* El historial crece de forma append-only y requiere políticas explícitas de retención si su volumen aumenta.
* Corregir un vínculo de identidad no altera los hechos capturados por TikTok.
