/**
 * sna-sync NUI: the sign-in, set-status and 911 call screens, and the notification panel.
 * It only talks to its own client script (https://<resource>/<callback>), never to the CAD.
 */
import {
  ClientEvents,
  NuiEvents,
  SnCommands,
  type AttachListCall,
  type FlowResult,
  type NotificationData,
  type NuiFlow,
  type StatusOption,
} from "../../lib/events";

const screen = document.getElementById("screen")!;
const notifications = document.getElementById("notifications")!;
let currentFlow: NuiFlow | null = null;

function resourceName() {
  return typeof GetParentResourceName === "function" ? GetParentResourceName() : "sna-sync";
}

async function post(callback: NuiEvents, data: unknown = {}) {
  try {
    await fetch(`https://${resourceName()}/${callback}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error(`[sna-sync-nui] ${callback} failed`, error);
  }
}

// ---- tiny DOM helper: text is always set with textContent
type Child = Node | string | null | undefined | false;
function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<Record<string, string | boolean | ((event: Event) => void)>> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === "function") element.addEventListener(key.replace(/^on/, ""), value);
    else if (value === true) element.setAttribute(key, "");
    else if (typeof value === "string") element.setAttribute(key, value);
  }
  for (const child of children) {
    if (child) element.append(child);
  }
  return element;
}

// ---- notifications
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * Messages are escaped. A few bare formatting tags that 0.14.3 scripts send (<b>, <li>, <br> ...)
 * are allowed back in, never with attributes, so nothing can run or load.
 */
function formatMessage(message: string) {
  return escapeHtml(message)
    .replace(/&#60;(\/?)(b|i|u|strong|em|ul|li)&#62;/gi, "<$1$2>")
    .replace(/&#60;br\s*\/?&#62;/gi, "<br>")
    .replace(/\n/g, "<br>");
}

function showNotification({ title, message, timeout }: NotificationData) {
  const time = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });

  const body = h("div", { class: "body" });
  body.innerHTML = formatMessage(message);

  const element = h(
    "div",
    { class: "notification", role: "status" },
    h("div", { class: "meta" }, h("span", {}, time), h("span", {}, "SnailyCAD")),
    h("div", { class: "title" }, title),
    body,
  );

  notifications.append(element);
  setTimeout(() => element.remove(), timeout && timeout > 0 ? timeout : 10_000);
}

// ---- screens
function closeScreen() {
  currentFlow = null;
  screen.hidden = true;
  screen.replaceChildren();
  void post(NuiEvents.CloseNui);
}

function modal(title: string, intro: Child[], content: Node[], wide = false) {
  const errorBox = h("div", { class: "error", hidden: true, role: "alert" });
  const element = h(
    "div",
    { class: wide ? "modal wide" : "modal", role: "dialog", "aria-label": title },
    h(
      "header",
      {},
      h("h1", {}, title),
      h("button", { class: "close", "aria-label": "Close", onclick: closeScreen }, "×"),
    ),
    h("p", {}, ...intro),
    errorBox,
    ...content,
  );
  screen.replaceChildren(element);
  screen.hidden = false;
  return { element, errorBox };
}

let pendingButton: HTMLButtonElement | null = null;
let errorBox: HTMLElement | null = null;

function setBusy(button: HTMLButtonElement | null) {
  if (pendingButton) pendingButton.disabled = false;
  pendingButton = button;
  if (button) button.disabled = true;
  if (errorBox && button) errorBox.hidden = true;
}

function openAuth() {
  currentFlow = "auth";
  const input = h("input", {
    id: "api_token",
    type: "password",
    autocomplete: "off",
    spellcheck: "false",
  });
  const submit = h("button", { class: "primary", type: "submit" }, "Authenticate");
  const form = h(
    "form",
    {
      onsubmit: (event) => {
        event.preventDefault();
        if (!input.value.trim()) return;
        setBusy(submit);
        void post(NuiEvents.Authenticate, { token: input.value.trim() });
      },
    },
    h("label", { for: "api_token" }, "Personal API Token"),
    input,
    h("div", { class: "actions" }, submit),
  );

  ({ errorBox } = modal(
    "SnailyCAD Personal API Token Authentication",
    [
      "Use your Personal API Token found at your CAD URL -> Account -> API Token.",
      h("br"),
      "This will allow you to interact with the CAD from within FiveM.",
    ],
    [form],
  ));
  input.focus();
}

function openSetStatus(data: { statuses?: StatusOption[]; currentStatusId?: string | null }) {
  currentFlow = "set-status";
  const select = h("select", { id: "status" });
  for (const status of data.statuses ?? []) {
    const option = h("option", { value: status.id }, status.label);
    if (status.id === data.currentStatusId) option.selected = true;
    select.append(option);
  }

  const submit = h("button", { class: "primary", type: "submit" }, "Save");
  const form = h(
    "form",
    {
      onsubmit: (event) => {
        event.preventDefault();
        if (!select.value) return;
        setBusy(submit);
        void post(NuiEvents.SetStatus, { statusId: select.value });
      },
    },
    h("label", { for: "status" }, "Status"),
    select,
    h("p", {}, "Additionally use ", h("code", {}, `/${SnCommands.SetStatus} <status-code>`)),
    h("div", { class: "actions" }, submit),
  );

  ({ errorBox } = modal("Set Status", ["Set the status for your active unit."], [form]));
  select.focus();
}

function openAttach(data: { calls?: AttachListCall[] }) {
  currentFlow = "attach";
  const calls = data.calls ?? [];

  const rows = calls.map((call) => {
    const type = call.isAttached ? "unassign" : "assign";
    const button = h(
      "button",
      {
        type: "button",
        onclick: () => {
          setBusy(button);
          void post(NuiEvents.AttachToCall, { type, callId: call.id });
        },
      },
      call.isAttached ? "Unassign from call" : "Assign to call",
    );
    return h(
      "tr",
      call.isAttached ? { class: "attached" } : {},
      h("td", {}, `#${call.caseNumber}`),
      h("td", {}, call.postal ? `${call.location} (${call.postal})` : call.location),
      h("td", {}, call.caller),
      h("td", { class: "description" }, call.description || "None"),
      h("td", {}, button),
    );
  });

  const table = calls.length
    ? h(
        "table",
        {},
        h(
          "thead",
          {},
          h(
            "tr",
            {},
            ...["Case Number", "Location", "Caller", "Description", "Actions"].map((t) =>
              h("th", {}, t),
            ),
          ),
        ),
        h("tbody", {}, ...rows),
      )
    : h("div", { class: "empty" }, "There are no active 911 calls.");

  ({ errorBox } = modal(
    "Active 911 Calls",
    [
      "A list of all active 911 calls. Click on any of them to assign yourself to a call.",
      h("br"),
      "Additionally use ",
      h("code", {}, `/${SnCommands.AttachTo911Call} <case-number>`),
    ],
    [table, h("div", { class: "actions" }, h("button", { onclick: closeScreen }, "Cancel"))],
    true,
  ));
}

function onFlowResult(result: FlowResult) {
  if (result.flow !== currentFlow) return;

  if (result.ok) {
    setBusy(null);
    closeScreen();
    if (result.message) {
      showNotification({ title: "SnailyCAD", message: result.message });
    }
    return;
  }

  setBusy(null);
  if (errorBox) {
    errorBox.textContent = result.message || "Something went wrong. See the F8 console.";
    errorBox.hidden = false;
  }
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !screen.hidden) closeScreen();
});

window.addEventListener("message", (event: MessageEvent<{ action?: string; data?: never }>) => {
  const { action, data } = event.data;
  switch (action) {
    case "sn:initialize": {
      console.log(`[sna-sync-nui] version ${(data as { version?: string } | undefined)?.version}`);
      break;
    }
    case ClientEvents.RequestAuthFlow: {
      openAuth();
      break;
    }
    case ClientEvents.RequestSetStatusFlow: {
      openSetStatus(data ?? {});
      break;
    }
    case ClientEvents.RequestCall911AttachFlow: {
      openAttach(data ?? {});
      break;
    }
    case ClientEvents.FlowResult: {
      if (data) onFlowResult(data);
      break;
    }
    case ClientEvents.CreateNotification: {
      const n = data as NotificationData | undefined;
      if (n && typeof n.title === "string" && typeof n.message === "string") showNotification(n);
      break;
    }
    default: {
      break;
    }
  }
});
