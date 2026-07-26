# Tarea

Revisa la implementación del issue #{{TASK_ID}} (`{{ISSUE_TITLE}}`) en `{{BRANCH}}` como un agente independiente.

## Diff

!`git diff {{TARGET_BRANCH}}...{{BRANCH}}`

## Commits

!`git log {{TARGET_BRANCH}}..{{BRANCH}} --oneline`

# Proceso

1. Lee el issue, el PRD padre, ADR 0013, `CONTEXT.md`, `AGENTS.md` y `.sandcastle/CODING_STANDARDS.md`.
2. Busca primero regresiones, incumplimientos del issue, fallos de autorización, redirects inseguros, pérdida de estado navegable y pruebas ausentes.
3. Verifica que no se hayan traducido contratos `/api/**` o `/overlay`, ni cambiado reglas de negocio fuera del slice.
4. Corrige en la rama todos los hallazgos confirmados y añade o ajusta pruebas.
5. Ejecuta pruebas relevantes, `pnpm exec tsc --noEmit` y lint focalizado. NUNCA ejecutes un build.
6. Si modificas código, crea un commit convencional sin atribución de IA.

No hagas push, no abras PR y no cierres el issue. Si el issue no está realmente completo, falla de forma explícita en vez de aprobar por cortesía.

Cuando la rama esté lista para revisión humana, emite `<promise>COMPLETE</promise>`.
