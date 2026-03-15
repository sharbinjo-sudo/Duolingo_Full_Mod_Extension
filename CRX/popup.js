// Everything runs after DOM is ready since script is at end of <body>

// =============================================
// TAB SWITCHING
// =============================================
function switchTab(tab) {
  document.getElementById('tab-max').classList.toggle('active', tab === 'max');
  document.getElementById('tab-autolingo').classList.toggle('active', tab === 'autolingo');
  document.getElementById('panel-max').classList.toggle('active', tab === 'max');
  document.getElementById('panel-autolingo').classList.toggle('active', tab === 'autolingo');
}

document.getElementById('tab-max').addEventListener('click', () => switchTab('max'));
document.getElementById('tab-autolingo').addEventListener('click', () => switchTab('autolingo'));

// =============================================
// DUOLINGO MAX - Version check & money saved
// =============================================
const current = chrome.runtime.getManifest().version;
const statusEl = document.getElementById('status');
const moneySavedEl = document.getElementById('moneySaved');

// Show our merged extension version (no remote check needed)
statusEl.textContent = `✅ Duolingo Max + Autolingo v${current}`;
statusEl.style.color = '#28df28';

chrome.storage.local.get('installDate', data => {
  const installDate = data.installDate || Date.now();
  if (!data.installDate) chrome.storage.local.set({ installDate });
  const msPerMonth = 30.44 * 24 * 60 * 60 * 1000;
  const monthsElapsed = Math.floor((Date.now() - installDate) / msPerMonth);
  const saved = ((monthsElapsed + 1) * 12.99).toFixed(2);
  moneySavedEl.textContent = `💰 You've saved $${saved}!`;
});

// =============================================
// AUTOLINGO
// =============================================
var enabled = false;

const update_enabled_slider = (value) => {
  const input_switch = document.getElementById("toggle-enabled-input");
  const text_elem = document.getElementById("toggle-enabled-text");
  if (!input_switch || !text_elem) return;
  input_switch.checked = value;
  text_elem.innerText = value ? "Enabled" : "Disabled";
};

const toggle_extension_enabled = () => {
  enabled = !enabled;
  chrome.storage.local.set({"autolingo_enabled": enabled});
  update_enabled_slider(enabled);
};

const send_event = (actionType, data = {}) => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs.length > 0 && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: actionType, ...data }, () => {
        if (chrome.runtime.lastError) {
          console.log("Could not send message:", chrome.runtime.lastError.message);
        }
      });
    }
  });
};

const render_autolingo = () => {
  const content_div = document.getElementById("autolingo-content");
  content_div.innerHTML = `
    <div class="content-row">
      <label class="autolingo-switch">
        <input id="toggle-enabled-input" type="checkbox">
        <span class="autolingo-slider"></span>
      </label>
      <div id="toggle-enabled-text">Disabled</div>
    </div>
    <div class="content-row delay-container">
      <label for="delay-input">Solve Delay (ms):</label>
      <input type="number" id="delay-input" min="0" max="2000" step="50">
    </div>
    <div style="margin-bottom:4px">
      <button id="solve-skip-button" class="row-button" title="Ctrl+Enter">⏩ Solve &amp; Skip</button>
    </div>
    <div>
      <button id="solve-button" class="row-button" title="Alt+Enter">✅ Solve</button>
    </div>
  `;

  document.getElementById("toggle-enabled-input").addEventListener("click", toggle_extension_enabled);
  document.getElementById("solve-button").addEventListener("click", () => send_event("solve_challenge"));
  document.getElementById("solve-skip-button").addEventListener("click", () => send_event("solve_skip_challenge"));

  const delayInput = document.getElementById("delay-input");
  chrome.storage.local.get("autolingo_delay", (response) => {
    let currentDelay = response.autolingo_delay;
    if (typeof currentDelay !== 'number' || currentDelay < 0 || currentDelay > 2000) currentDelay = 500;
    delayInput.value = currentDelay;
  });

  delayInput.addEventListener("change", () => {
    let delay = parseInt(delayInput.value, 10);
    if (isNaN(delay) || delay < 0) delay = 0;
    else if (delay > 2000) delay = 2000;
    delayInput.value = delay;
    chrome.storage.local.set({"autolingo_delay": delay});
    send_event("set_delay", { delay });
  });

  update_enabled_slider(enabled);
};

// Load autolingo state and render immediately (DOM is already ready)
chrome.storage.local.get(["autolingo_enabled"], (response) => {
  if (chrome.runtime.lastError) {
    console.error("Storage error:", chrome.runtime.lastError);
    return;
  }
  enabled = Boolean(response["autolingo_enabled"]);
  render_autolingo();
});
