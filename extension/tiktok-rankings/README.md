# Extension privada de Rankings TikTok

## Estado

Esta es una extension Chrome MV3 para el Owner. El collector usa el protocolo de depuración de Chrome para observar respuestas de red que la pestaña autenticada ya recibe y solo conserva el contrato compacto del ranking. No reconstruye requests, no calcula firmas, no lee cookies y nunca manda respuestas crudas al portal.

## Instalacion local

1. Abrir `chrome://extensions`.
2. Activar **Developer mode**.
3. Elegir **Load unpacked** y seleccionar esta carpeta.
4. Abrir las opciones de la extension y guardar una vez la URL HTTPS del portal y `TIKTOK_IMPORT_TOKEN`.

Para pruebas locales también se acepta `http://localhost:3000` o `http://127.0.0.1:3000`. Cualquier otro origen sin HTTPS se rechaza.

El endpoint esperado por #18 es `POST {portalUrl}/api/tiktok/rankings/import`. La extension envia un unico batch compacto con `version`, `idempotency_key`, `captured_at` y exactamente ocho `sets`, autenticado mediante `x-tiktok-import-token`.

## Captura y verificacion manual requerida

No se puede afirmar compatibilidad automatica con TikTok sin una sesion real del Owner. La UI y las requests privadas pueden cambiar, y este repositorio no contiene una sesion DOM real ni permite probar firmas. La verificacion precisa es:

1. Abrir LIVE Center, iniciar sesion normalmente y dejar abierta la pantalla de rankings.
2. Cerrar DevTools si estaba abierto: Chrome solo permite un depurador por pestaña.
3. Pulsar **Importar ahora** en la pestaña activa. Chrome mostrará un aviso mientras la extensión captura la red.
4. Cambiar manualmente entre espectadores/regalos y último live/7/28/60 días para provocar las ocho requests.
5. Confirmar que el popup llega a `8/8`; cada set debe corresponder a su `rank_type` y `rank_time_type`.
6. Confirmar respuesta exitosa de #18 y que un fallo antes de `8/8` no hace ninguna petición al portal.

Si alguna combinación no aparece, la extension informa un batch incompleto y no intenta adivinar selectores, endpoints o firmas. El siguiente trabajo debe adaptar el collector a la evidencia de esa sesión, respetando los términos de TikTok.

## Pruebas

Desde esta carpeta, sin instalar dependencias nuevas:

```sh
node --test tests/collector.test.mjs
```
