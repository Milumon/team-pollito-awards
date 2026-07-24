## Parent

#17

## What to build

Permitir que una credencial exclusiva de TikTok publique un Batch de Rankings completo e inmutable. Un batch contiene exactamente espectadores y regalos para último live, 7, 28 y 60 días. La lectura pública debe cambiar del snapshot anterior al nuevo de forma atómica, y los reintentos deben ser idempotentes.

## Acceptance criteria

- [ ] Una migración crea batches, sets, entries y activaciones inmutables con IDs de TikTok almacenados como texto.
- [ ] Un endpoint autenticado por una credencial exclusiva acepta el contrato compacto y rechaza tokens administrativos o del overlay.
- [ ] Exactamente ocho combinaciones válidas se persisten y activan en una sola transacción.
- [ ] Una combinación ausente, duplicada o inválida rechaza todo y conserva la activación anterior.
- [ ] Repetir el mismo idempotency key y contenido no duplica datos; cambiar el contenido produce conflicto.
- [ ] Un endpoint de lectura devuelve rankings únicamente desde el batch activo.
- [ ] Fixtures compactos derivados de las respuestas reales prueban el comportamiento 8/8 y el rechazo atómico.

## Blocked by

None - can start immediately
