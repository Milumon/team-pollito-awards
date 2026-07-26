# Issues disponibles

<issues-json>

!`gh issue list --state open --label ready-for-agent --limit 100 --json number,title,body,labels,comments --jq '[.[] | select(([.labels[].name] | index("prd")) | not) | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`

</issues-json>

# Tarea

Construye el grafo de dependencias usando la sección `Blocked by` de cada issue. Un issue está desbloqueado solo cuando todos los issues que lo bloquean están cerrados.

Selecciona exclusivamente issues desbloqueados. No ignores dependencias para mantener ocupados a los agentes. Asigna ramas deterministas con el formato exacto `agent/issue-{id}`.

No incluyas PRDs, issues con label `ready-for-human` ni trabajo que no aparezca en el JSON.

# Salida

Emite únicamente un objeto JSON válido dentro de tags `<plan>`:

<plan>
{"issues":[{"id":"24","title":"Título exacto","branch":"agent/issue-24"}]}
</plan>

Si no hay trabajo desbloqueado, emite `<plan>{"issues":[]}</plan>`.
