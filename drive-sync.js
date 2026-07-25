
const DriveSync = (() => {
  const FILE_NAME = "italy-trip-data.json";
  const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
  let tokenClient = null;
  let accessToken = "";
  let fileId = "";
  let saveTimer = null;
  let syncing = false;
  let initialized = false;

  const setStatus = (text, mode="offline") => {
    const status = document.querySelector("#syncStatus");
    const dot = document.querySelector("#syncDot");
    if(status) status.textContent = text;
    if(dot) dot.className = "sync-dot " + mode;
  };

  const authHeaders = (extra={}) => ({
    Authorization: `Bearer ${accessToken}`,
    ...extra
  });

  async function api(url, options={}) {
    const response = await fetch(url, {
      ...options,
      headers: authHeaders(options.headers || {})
    });
    if(response.status === 401) {
      accessToken = "";
      updateButtons(false);
      setStatus("פג תוקף החיבור – יש להתחבר שוב", "offline");
      throw new Error("Google authorization expired");
    }
    if(!response.ok) {
      const text = await response.text();
      throw new Error(`Google Drive error ${response.status}: ${text}`);
    }
    return response;
  }

  function updateButtons(connected) {
    const connect = document.querySelector("#connectDrive");
    const sync = document.querySelector("#syncNow");
    const disconnect = document.querySelector("#disconnectDrive");
    if(connect) connect.hidden = connected;
    if(sync) sync.hidden = !connected;
    if(disconnect) disconnect.hidden = !connected;
  }

  async function findFile() {
    const fields = encodeURIComponent("files(id,name,modifiedTime)");
    const q = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`);
    const res = await api(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=${fields}`);
    const data = await res.json();
    fileId = data.files?.[0]?.id || "";
    return fileId;
  }

  function getLocalPayload() {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      expenses: JSON.parse(localStorage.getItem("expenses") || "[]"),
      favorites: JSON.parse(localStorage.getItem("favorites") || "[]"),
      checklist: JSON.parse(localStorage.getItem("checklist") || "{}")
    };
  }

  function applyPayload(data) {
    if(!data || typeof data !== "object") return;
    if(Array.isArray(data.expenses)) localStorage.setItem("expenses", JSON.stringify(data.expenses));
    if(Array.isArray(data.favorites)) localStorage.setItem("favorites", JSON.stringify(data.favorites));
    if(data.checklist && typeof data.checklist === "object") localStorage.setItem("checklist", JSON.stringify(data.checklist));
    if(typeof renderExpenses === "function") renderExpenses();
    if(typeof renderFavorites === "function") renderFavorites();
    if(typeof renderChecklist === "function") renderChecklist();
  }

  async function createFile(payload) {
    const boundary = "trip_sync_" + Date.now();
    const metadata = JSON.stringify({
      name: FILE_NAME,
      parents: ["appDataFolder"],
      mimeType: "application/json"
    });
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(payload)}\r\n` +
      `--${boundary}--`;

    const res = await api(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
      {
        method: "POST",
        headers: {"Content-Type": `multipart/related; boundary=${boundary}`},
        body
      }
    );
    const data = await res.json();
    fileId = data.id;
  }

  async function updateFile(payload) {
    await api(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
      }
    );
  }

  async function loadRemote() {
    if(!fileId) return false;
    const res = await api(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
    const data = await res.json();
    applyPayload(data);
    return true;
  }

  async function saveNow() {
    if(!accessToken || syncing) return;
    syncing = true;
    setStatus("מסנכרן ל-Google Drive…", "syncing");
    try {
      const payload = getLocalPayload();
      if(!fileId) await findFile();
      if(fileId) await updateFile(payload);
      else await createFile(payload);
      setStatus("הנתונים נשמרו ב-Google Drive", "online");
    } catch(error) {
      console.error(error);
      setStatus("הסנכרון נכשל – הנתונים עדיין שמורים במכשיר", "offline");
    } finally {
      syncing = false;
    }
  }

  function scheduleSave() {
    if(!accessToken) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 1800);
  }

  async function afterAuthorized(tokenResponse) {
    if(tokenResponse.error) {
      setStatus("ההתחברות ל-Google נכשלה", "offline");
      return;
    }
    accessToken = tokenResponse.access_token;
    updateButtons(true);
    setStatus("מחובר – טוען נתונים מהענן…", "syncing");
    try {
      await findFile();
      if(fileId) {
        await loadRemote();
        setStatus("מחובר ומסונכרן עם Google Drive", "online");
      } else {
        await saveNow();
      }
    } catch(error) {
      console.error(error);
      setStatus("מחובר, אך טעינת הנתונים נכשלה", "offline");
    }
  }

  function connect() {
    const clientId = window.TRIP_GOOGLE_CLIENT_ID || "";
    if(!clientId || clientId.includes("PASTE_YOUR")) {
      alert("יש להגדיר תחילה Google OAuth Client ID בקובץ config.js");
      return;
    }
    if(!window.google?.accounts?.oauth2) {
      alert("ספריית Google עדיין נטענת. נסה שוב בעוד רגע.");
      return;
    }
    if(!tokenClient) {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: afterAuthorized
      });
    }
    tokenClient.requestAccessToken({prompt: accessToken ? "" : "consent"});
  }

  function disconnect() {
    if(accessToken && window.google?.accounts?.oauth2) {
      google.accounts.oauth2.revoke(accessToken, () => {});
    }
    accessToken = "";
    fileId = "";
    updateButtons(false);
    setStatus("לא מחובר ל-Google Drive", "offline");
  }

  function init() {
    if(initialized) return;
    initialized = true;
    document.querySelector("#connectDrive")?.addEventListener("click", connect);
    document.querySelector("#syncNow")?.addEventListener("click", saveNow);
    document.querySelector("#disconnectDrive")?.addEventListener("click", disconnect);
    updateButtons(false);
    setStatus("לא מחובר ל-Google Drive", "offline");
  }

  return {init, connect, disconnect, saveNow, scheduleSave};
})();
