const injectScript = (fileName) => {
    let th = document.getElementsByTagName('body')[0];
    let s = document.createElement('script');
    s.setAttribute('type', 'module');
    s.setAttribute('src', `chrome-extension://${chrome.runtime.id}/${fileName}`);
    th.appendChild(s);
}

const send_custom_event = (event_name, data=null) => {
    var event = document.createEvent("CustomEvent");
    event.initCustomEvent(event_name, true, true, {"data": data});
    document.dispatchEvent(event);
}

// Always inject injected.js on every Duolingo page load.
// The autolingo_autocomplete flag inside injected.js controls whether
// it actually auto-solves (only true when overlay button was clicked).
injectScript("content_scripts/injected.js");

// Forward messages from popup to injected.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case "solve_challenge":
            send_custom_event("solve_challenge");
            break;
        case "solve_skip_challenge":
            send_custom_event("solve_skip_challenge");
            break;
        case "set_delay":
            send_custom_event("set_delay", message.delay);
            break;
        default:
            console.error(`Unknown message type '${message.action}'`);
    }
});

// When the extension asks for the id, give it!
window.addEventListener("get_extension_id", () => {
    send_custom_event("extension_id", chrome.runtime.id);
    chrome.storage.local.get("autolingo_delay", (response) => {
        const delay = response["autolingo_delay"];
        send_custom_event("set_delay", delay);
    });
});
