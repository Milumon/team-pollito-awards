const form = document.querySelector("#form");
const status = document.querySelector("#status");
const portalUrl = document.querySelector("#portalUrl");
const importToken = document.querySelector("#importToken");

const existing = await chrome.storage.local.get(["portalUrl", "importToken"]);
if (existing.portalUrl) portalUrl.value = existing.portalUrl;
if (existing.importToken) importToken.placeholder = "Token guardado (escribe otro para rotarlo)";

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const url = portalUrl.value.trim().replace(/\/$/, "");
  let parsedUrl;
  try { parsedUrl = new URL(url); }
  catch { status.textContent = "La URL del portal no es valida."; return; }
  if (parsedUrl.hostname === "tiktok.com" || parsedUrl.hostname.endsWith(".tiktok.com")) {
    status.textContent = "Usa la URL de Team Pollito, no la URL de TikTok LIVE Center.";
    return;
  }
  const localDevelopment = parsedUrl.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsedUrl.hostname);
  if (parsedUrl.protocol !== "https:" && !localDevelopment) {
    status.textContent = "La URL debe usar HTTPS, excepto localhost para desarrollo.";
    return;
  }
  let originPattern;
  originPattern = `${parsedUrl.origin}/*`;
  const permissionGranted = await chrome.permissions.request({ origins: [originPattern] });
  if (!permissionGranted) { status.textContent = "Chrome necesita permiso para conectar con el portal."; return; }
  const values = { portalUrl: url };
  if (importToken.value) values.importToken = importToken.value;
  await chrome.storage.local.set(values);
  importToken.value = "";
  status.textContent = "Configuracion guardada localmente.";
});
