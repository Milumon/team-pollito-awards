const importButton = document.querySelector("#import");
const progress = document.querySelector("#progress");
const message = document.querySelector("#message");

const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const render = (state) => {
  progress.replaceChildren();
  const heading = document.createElement("strong");
  heading.textContent = `${state.count}/${state.total} combinaciones capturadas${state.status === "publishing" ? " - publicando" : ""}`;
  progress.append(heading);
  for (const combination of state.combinations || []) {
    const row = document.createElement("div");
    row.textContent = `${combination.captured ? "[x]" : combination.error ? "[!]" : "[ ]"} ${combination.metric}/${combination.period}${combination.error ? ` - ${combination.error}` : ""}`;
    progress.append(row);
  }
  message.textContent = state.error || (state.status === "published" ? "Batch publicado correctamente." : "Cierra DevTools y selecciona cada periodo y metrica en LIVE Center; la extension capturara sus respuestas.");
  importButton.disabled = ["capturing", "publishing"].includes(state.status);
};

chrome.runtime.onMessage.addListener((message) => { if (message.type === "progress" && message.tabId === tab?.id) render(message.state); });
const current = await chrome.runtime.sendMessage({ type: "get-state", tabId: tab?.id });
render(current || { count: 0, total: 8, combinations: [], status: "idle" });

importButton.addEventListener("click", async () => {
  const result = await chrome.runtime.sendMessage({ type: "start-import", tabId: tab?.id });
  if (!result.ok) message.textContent = result.error;
  else render(result.state);
});
document.querySelector("#options").addEventListener("click", () => chrome.runtime.openOptionsPage());
