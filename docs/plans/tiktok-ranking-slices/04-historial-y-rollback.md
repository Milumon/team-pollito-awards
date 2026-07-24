## Parent

#17

## What to build

Permitir consultar snapshots completos anteriores y activar nuevamente uno de ellos sin modificar ni borrar hechos históricos. La consola debe mostrar la evolución de un Miembro Oficial dentro de la misma combinación.

## Acceptance criteria

- [ ] El historial lista batches completos con captura, ventana fuente y activaciones.
- [ ] Una ruta estrictamente autenticada por Supabase permite rollback con motivo y actor.
- [ ] Rollback añade una activación; no actualiza ni elimina batches, sets o entries.
- [ ] La consola permite elegir snapshots comparables de la misma métrica/período.
- [ ] La posición personal muestra subió, bajó, entró, salió o sin cambio respecto del snapshot anterior comparable.
- [ ] Las pruebas demuestran inmutabilidad y que el rollback cambia todas las combinaciones juntas.

## Blocked by

- #18
- #21
