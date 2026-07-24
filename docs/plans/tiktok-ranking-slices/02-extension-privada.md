## Parent

#17

## What to build

Crear una extensión privada Chrome Manifest V3 con una acción `Importar ahora`. Debe probar y encapsular la obtención de las ocho combinaciones desde una sesión autenticada de TikTok LIVE Center, normalizar únicamente el contrato compacto y enviar un solo batch al portal.

## Acceptance criteria

- [ ] La extensión se configura una vez con URL del portal y credencial exclusiva de ingestión.
- [ ] `Importar ahora` obtiene las ocho combinaciones y muestra progreso individual.
- [ ] El colector no envía cookies, firmas, headers ni payloads crudos de TikTok al portal.
- [ ] Si una combinación falla, se informa el detalle y no se envía un batch publicable parcial.
- [ ] Un resultado 8/8 envía un solo payload con idempotency key y muestra la confirmación del backend.
- [ ] Los IDs y valores se preservan como strings; las posiciones se derivan del orden fuente.
- [ ] La estrategia de captura queda documentada y probada manualmente contra una sesión real antes de declararse compatible.

## Blocked by

- #18
