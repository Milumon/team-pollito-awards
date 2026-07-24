# PRD: Integración de Rankings de TikTok LIVE

## Problem Statement

El Owner consulta clasificaciones de espectadores y regalos en TikTok LIVE Center, pero esa información queda aislada en una API privada, extensa y no documentada. Hoy no existe una forma segura de importarla al portal, publicar clasificaciones completas en la landing ni permitir que cada Miembro Oficial consulte su actividad histórica.

Copiar respuestas manualmente no escala, expone información innecesaria y puede producir clasificaciones parciales. Además, `profiles.tiktok_user` contiene un identificador mutable, mientras TikTok entrega un ID estable que excede el rango seguro de enteros de JavaScript.

## Solution

Crear una extensión privada de Chrome, utilizada exclusivamente por el Owner, con una acción manual `Importar ahora`. La extensión obtendrá las ocho combinaciones de clasificación (espectadores y regalos para último live, 7, 28 y 60 días), reducirá las respuestas a un contrato compacto y enviará un único batch al portal mediante una credencial exclusiva.

El backend validará y publicará el batch completo en una transacción. Si falta una combinación o hay datos inválidos, conservará el batch publicado anterior. Cada importación válida quedará como snapshot inmutable, permitirá rollback y vinculará identidades de TikTok con Miembros Oficiales aprobados mediante el `display_id` normalizado, sin perder el ID estable de TikTok.

La landing mostrará clasificaciones comunitarias actuales y la consola permitirá a cada Miembro Oficial consultar su posición, métricas e historial.

## User Stories

1. Como Owner, quiero iniciar toda la importación con un único botón, para no repetir acciones manuales por cada clasificación.
2. Como Owner, quiero que la extensión obtenga espectadores y regalos para los cuatro períodos, para publicar una vista completa de la actividad.
3. Como Owner, quiero ver el progreso de las ocho combinaciones, para saber cuál falló.
4. Como Owner, quiero recibir un resultado explícito `8/8`, para saber que el nuevo snapshot fue publicado.
5. Como Owner, quiero que una importación parcial no modifique el portal, para evitar mezclar períodos de fechas diferentes.
6. Como Owner, quiero usar una credencial exclusiva de importación, para que la extensión no tenga permisos administrativos generales.
7. Como Owner, quiero poder rotar la credencial, para invalidar una copia antigua de la extensión.
8. Como sistema, quiero conservar los IDs estables de TikTok como texto, para evitar pérdida de precisión.
9. Como sistema, quiero tratar `display_id` como nombre mutable, para poder vincularlo y corregirlo sin cambiar la identidad histórica.
10. Como sistema, quiero guardar snapshots inmutables, para conservar la actividad de cada live y período.
11. Como sistema, quiero hacer idempotentes los reintentos, para no duplicar snapshots por doble clic o fallos de red.
12. Como Administrador, quiero consultar el historial de batches, para conocer cuándo y qué se publicó.
13. Como Administrador, quiero activar nuevamente un batch anterior, para recuperarme de una importación incorrecta sin borrar datos.
14. Como Administrador, quiero corregir vínculos ambiguos o incorrectos, para asignar actividad a la persona correcta.
15. Como visitante, quiero ver participantes destacados en la landing, para reconocer la actividad real de la comunidad.
16. Como Miembro Oficial, quiero cambiar entre espectadores y regalos, para analizar formas distintas de participación.
17. Como Miembro Oficial, quiero cambiar entre último live, 7, 28 y 60 días, para analizar distintos horizontes temporales.
18. Como Miembro Oficial, quiero encontrar mi posición aunque no esté entre los primeros, para conocer mi participación.
19. Como Miembro Oficial, quiero consultar snapshots anteriores, para observar mi evolución.
20. Como Miembro Oficial, quiero distinguir entre “sin actividad” y “sin datos importados”, para interpretar correctamente el dashboard.
21. Como usuario, quiero ver la fecha y ventana de cada ranking, para saber qué período representa.
22. Como usuario, quiero que el portal conserve el último snapshot válido durante un fallo, para no reemplazar datos reales por vacíos.

## Implementation Decisions

- El vocabulario canónico será: **Identidad TikTok**, **Snapshot de Ranking**, **Batch de Rankings** y **Activación de Ranking**.
- Las métricas canónicas serán `viewers` (`rank_type=3`) y `gifts` (`rank_type=2`).
- Los períodos canónicos serán `last_live`, `7_days`, `28_days` y `60_days`, correspondientes a `rank_time_type` 1, 2, 3 y 4.
- Un Batch de Rankings debe contener exactamente el producto cartesiano de dos métricas por cuatro períodos, sin duplicados.
- La extensión será Chrome Manifest V3, privada y utilizada solo por el Owner.
- La importación será manual mediante `Importar ahora`; no habrá ejecución al abrir Live Center ni programación automática.
- La primera implementación del colector debe probar cómo obtener las ocho respuestas desde la UI autenticada de TikTok. No se asumirán estables `X-Bogus`, `X-Gnarly`, cookies ni endpoints privados.
- La extensión nunca enviará cookies, firmas, headers ni payloads completos de TikTok al portal.
- El contrato compacto incluirá versión, idempotency key, fecha de captura, combinación, ventana fuente, posición, ID estable, `display_id`, nickname, avatar estable cuando exista y valor.
- Los IDs estables y valores viajarán como strings decimales en las fronteras del sistema.
- La posición se deriva del orden de `rank_list`; no se confiará en un campo de posición inexistente.
- El batch se validará antes de persistir y se publicará mediante una función transaccional de PostgreSQL.
- El batch, sus sets y entries serán inmutables. Publicar o hacer rollback añadirá una Activación de Ranking.
- La activación vigente será la activación más reciente, no un booleano mutable en múltiples batches.
- Un idempotency key repetido con el mismo contenido será un éxito sin cambios; con contenido distinto responderá conflicto.
- El ID estable de TikTok será la identidad primaria externa. `display_id` y nickname serán snapshots de presentación.
- En el primer import, `display_id` normalizado se comparará con `profiles.tiktok_user` de Miembros Oficiales aprobados.
- Los vínculos ausentes no invalidarán un batch. Los vínculos ambiguos sí impedirán una asignación automática y quedarán pendientes de corrección administrativa.
- Las clasificaciones públicas y de miembros mostrarán exclusivamente Miembros Oficiales vinculados. No se expondrán espectadores externos.
- La landing mostrará una selección compacta de rankings actuales; la consola ofrecerá las ocho combinaciones y la posición personal.
- El historial comparará únicamente snapshots completos de la misma métrica y período.
- La extensión usará una credencial estática pero exclusiva y revocable en el primer alcance; pairing codes y distribución multiusuario quedan fuera de alcance.
- El endpoint de ingestión aplicará límites de tamaño, comparación timing-safe de credencial y no utilizará `ADMIN_PANEL_TOKEN` ni `OVERLAY_TOKEN`.
- Las rutas de rollback y corrección de vínculos exigirán JWT de Supabase del Owner/Administrador y no aceptarán el token administrativo histórico.

## Testing Decisions

- El seam principal será el endpoint público del módulo de importación: ocho rankings válidos cambian el batch activo de una sola vez; cualquier combinación faltante deja intacto el batch anterior.
- Las pruebas describirán comportamiento observable y no cadenas internas de Supabase.
- Un adaptador puro se probará con fixtures compactos derivados de las respuestas reales, nunca con los JSON completos de 25 mil líneas.
- El validador cubrirá matriz 8/8, combinaciones duplicadas, IDs inseguros, orden descendente, valores inválidos e idempotencia.
- La función SQL tendrá pruebas de integración para atomicidad, snapshots inmutables y rollback por activación cuando el entorno de Supabase esté disponible.
- La extensión separará el colector de TikTok del cliente de ingestión para poder probar normalización y estados `8/8` sin cookies reales.
- Las vistas se probarán en el nivel más alto disponible: respuesta de ranking actual, filtrado a Miembros Oficiales y estados de posición personal.
- No se afirmará que el colector funciona contra TikTok hasta probarlo manualmente en una sesión real del Owner.

## Out of Scope

- Importaciones automáticas o programadas.
- Distribución pública o Chrome Web Store.
- Uso por administradores distintos del Owner.
- Evadir login, CAPTCHA, controles anti-bot o restricciones de TikTok.
- Garantizar estabilidad de una API privada de TikTok.
- Enviar cookies, tokens o firmas TikTok al portal.
- Publicar identidades de espectadores no vinculados.
- Editar manualmente valores o posiciones.
- Rankings en tiempo real durante un live.
- Premios, puntos o moderación automática basados en rankings.
- Gráficas avanzadas, exportación CSV o analítica predictiva.
- Recuperar historia anterior al primer Snapshot de Ranking.

## Further Notes

- Los payloads reales de 7 días confirmaron la estructura compartida: 99 entries de espectadores y 79 de regalos.
- `rank_time_begin` y `rank_time_end` deben conservarse; los nombres de período no deben inferirse por duración aproximada.
- Las URLs firmadas de avatar expiran. La presentación debe preferir el avatar persistente del perfil vinculado o almacenar solo un URI estable de TikTok.
- La integración debe revisarse contra los términos aplicables de TikTok antes de producción.
