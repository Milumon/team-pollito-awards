# Tarea

Implementa exclusivamente el issue #{{TASK_ID}}: {{ISSUE_TITLE}} en la rama `{{BRANCH}}`.

Lee el issue completo y su PRD padre con `gh`. Lee también `AGENTS.md`, `CONTEXT.md`, los ADR relevantes y la documentación incluida en la versión instalada de Next.js antes de modificar código del framework.

# Ejecución

1. Explora el recorrido actual y construye una prueba que pueda detectar el comportamiento solicitado.
2. Implementa el slice vertical completo respetando ADR 0013 y el vocabulario del dominio.
3. Conserva reglas de negocio existentes; este trabajo cambia navegación, no comportamiento funcional.
4. Usa URLs humanas en español y conserva `/api/**` y `/overlay` técnicos.
5. Ejecuta las pruebas relevantes, `pnpm exec tsc --noEmit` y lint focalizado en archivos modificados.
6. NUNCA ejecutes `pnpm build`, `next build` ni variantes equivalentes.
7. No leas, copies ni commitees secretos o archivos `.env`.
8. Realiza commits convencionales sin atribución de IA.

No hagas push, no abras PR y no cierres el issue. Sandcastle publica la rama después de la revisión.

Si un bloqueo impide completar el issue, comenta evidencia concreta en GitHub y no inventes una solución parcial.

Cuando todos los criterios de aceptación estén verificados, emite `<promise>COMPLETE</promise>`.
