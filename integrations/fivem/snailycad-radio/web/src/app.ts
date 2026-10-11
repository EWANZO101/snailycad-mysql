/**
 * SnailyCAD Radio - in-game UI (FiveM NUI). Talks to the CAD's radio server with the same client
 * the CAD uses in the browser; the Lua side handles keys, animations, positional audio and access.
 *
 * Build: node integrations/fivem/build.mjs (writes ../html/app.js)
 */
import {
  RadioClient,
  type RadioChannelInfo,
  type RadioTokenResponse,
} from "@snailycad/radio/browser";

declare function GetParentResourceName(): string;

interface InitMessage {
  action: "init";
  token: RadioTokenResponse;
  settings: {
    volume: number;
    earpiece: boolean;
    radioEffect: boolean;
    tones: boolean;
    channel: string | null;
    hud: boolean;
    locale: Record<string, string>;
  };
}

type LuaMessage =
  | InitMessage
  | { action: "token"; token: RadioTokenResponse | null; error?: string }
  | { action: "ptt"; on: boolean }
  | { action: "setChannel"; channel: string }
  | { action: "stepChannel"; direction: 1 | -1 }
  | { action: "earpiece"; on: boolean }
  | { action: "power"; on: boolean }
  | { action: "volume"; volume: number }
  | { action: "open" }
  | { action: "close" }
  | { action: "nearby"; radios: { channel: string; volume: number; pan: number }[] }
  | { action: "tone"; tone: string };

const resource =
  typeof GetParentResourceName === "function" ? GetParentResourceName() : "snailycad-radio";

function post<T = unknown>(name: string, data: unknown = {}): Promise<T | null> {
  return fetch(`https://${resource}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(data),
  })
    .then((response) => response.json() as Promise<T>)
    .catch(() => null);
}

// --- state ----------------------------------------------------------------------------------

let client: RadioClient | null = null;
let powered = true;
let channelId: string | null = null;
let earpiece = false;
let volume = 0.8;
let showHud = true;
let text: Record<string, string> = {};
/** proximity listens currently open: channel -> last volume */
const nearby = new Map<string, number>();
let pendingToken: ((token: RadioTokenResponse) => void) | null = null;
let pendingTokenError: ((error: Error) => void) | null = null;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const tr = (key: string, fallback: string) => text[key] ?? fallback;

function channels(): RadioChannelInfo[] {
  return client?.channels ?? [];
}

function currentChannel() {
  return channels().find((c) => c.id === channelId) ?? null;
}

// --- rendering --------------------------------------------------------------------------------

function talkers(): string[] {
  if (!client || !channelId) return [];
  return [...(client.joined.get(channelId)?.talking.values() ?? [])];
}

function render() {
  const channel = currentChannel();
  const connected = client?.status === "connected";
  const transmitting = !!client?.transmitting;
  const speaking = talkers();

  const lcdTop = !powered
    ? ""
    : !connected
      ? tr("connecting", "SEARCHING…")
      : (channel?.name ?? tr("noChannel", "NO CHANNEL"));
  const lcdBottom = !powered
    ? ""
    : transmitting
      ? tr("tx", "TX")
      : speaking.length
        ? speaking.join(", ")
        : (channel?.frequency ?? "");

  $("lcd-top").textContent = lcdTop;
  $("lcd-bottom").textContent = lcdBottom;
  $("lcd").classList.toggle("off", !powered);
  $("led").className = transmitting ? "led tx" : speaking.length ? "led rx" : "led";
  $("earpiece").classList.toggle("active", earpiece);
  $("power").classList.toggle("active", powered);
  ($("volume") as HTMLInputElement).value = String(volume);

  const hud = $("hud");
  hud.hidden = !showHud || !powered || !channel;
  $("hud-channel").textContent = channel
    ? `${channel.name}${channel.frequency ? ` · ${channel.frequency}` : ""}`
    : "";
  $("hud-status").textContent = transmitting ? tr("tx", "TX") : speaking.join(", ");
  hud.className = transmitting ? "hud tx" : speaking.length ? "hud rx" : "hud";
  $("hud-earpiece").hidden = !earpiece;
}

// --- radio ------------------------------------------------------------------------------------

function requestToken(): Promise<RadioTokenResponse> {
  return new Promise((resolve, reject) => {
    pendingToken = resolve;
    pendingTokenError = reject;
    void post("requestToken");
    setTimeout(() => {
      if (pendingToken === resolve) {
        pendingToken = null;
        reject(new Error("No radio token from the server."));
      }
    }, 15_000);
  });
}

function joinChannel(id: string | null) {
  if (!client) return;
  if (channelId && channelId !== id && client.joined.get(channelId)?.mode === "member") {
    client.leave(channelId);
  }
  channelId = id;
  if (id && powered) {
    client.join(id, "member");
    client.setTransmitChannel(id);
    client.setChannelVolume(id, 1);
  }
  void post("channel", { channel: id, name: currentChannel()?.name ?? null });
  render();
}

function start(message: InitMessage) {
  const settings = message.settings;
  volume = settings.volume;
  earpiece = settings.earpiece;
  showHud = settings.hud;
  text = settings.locale;

  let firstToken: RadioTokenResponse | null = message.token;
  client?.disconnect();
  client = new RadioClient({
    clientName: "fivem/1.0",
    radioEffect: settings.radioEffect,
    tones: settings.tones,
    followSwitch: false,
    getToken: async () => {
      if (firstToken) {
        const token = firstToken;
        firstToken = null;
        return token;
      }
      return requestToken();
    },
  });
  client.setVolume(volume);

  client.on("ready", ({ channels: list }) => {
    const wanted = channelId ?? settings.channel;
    const valid = list.find((c) => c.id === wanted) ?? list[0] ?? null;
    channelId = null;
    joinChannel(valid?.id ?? null);
    client?.setRadioState({ earpiece });
    for (const [channel, level] of nearby) openNearby(channel, level, 0);
    void post("ready", { channels: list, identity: client?.identity });
  });
  client.on("channels", (list) => {
    if (channelId && !list.some((c) => c.id === channelId)) joinChannel(list[0]?.id ?? null);
    void post("channels", { channels: list });
    render();
  });
  // dispatch moved this player to another channel
  client.on("switch", ({ channel }) => {
    joinChannel(channel);
    void post("switched", { channel, name: currentChannel()?.name ?? null });
  });
  client.on("transmit", ({ on }) => {
    void post("transmit", { on, channel: channelId });
    render();
  });
  client.on("talk", ({ channel, name, on }) => {
    if (channel === channelId) void post("talk", { name, on });
    render();
  });
  client.on("busy", () => void post("busy"));
  client.on("error", ({ message: error }) => void post("error", { message: error }));
  for (const event of ["status", "joined", "left", "members", "preempted"] as const) {
    client.on(event, () => render());
  }
  void client.connect();
  render();
}

/** another player's radio nearby: listen to their channel at a distance-based volume */
function openNearby(channel: string, level: number, pan: number) {
  if (!client) return;
  if (channel === channelId) return; // already on it at full volume
  if (!client.joined.has(channel)) client.join(channel, "listen");
  client.setChannelVolume(channel, level);
  client.setChannelPan(channel, pan);
}

function updateNearby(radios: { channel: string; volume: number; pan: number }[]) {
  if (!client) return;
  const seen = new Set<string>();
  for (const radio of radios) {
    // several radios on one channel: the loudest wins
    if (seen.has(radio.channel) && (nearby.get(radio.channel) ?? 0) >= radio.volume) continue;
    seen.add(radio.channel);
    nearby.set(radio.channel, radio.volume);
    openNearby(radio.channel, radio.volume, radio.pan);
  }
  for (const channel of [...nearby.keys()]) {
    if (seen.has(channel)) continue;
    nearby.delete(channel);
    if (channel !== channelId && client.joined.get(channel)?.mode === "listen") {
      client.leave(channel);
    }
  }
}

function setPower(on: boolean) {
  powered = on;
  if (!client) return render();
  if (!on) {
    client.stopTransmit();
    if (channelId) client.leave(channelId);
  } else if (channelId) {
    client.join(channelId, "member");
    client.setTransmitChannel(channelId);
  }
  void post("power", { on });
  render();
}

function stepChannel(direction: 1 | -1) {
  const list = channels();
  if (!list.length) return;
  const index = list.findIndex((c) => c.id === channelId);
  const next = list[(index + direction + list.length) % list.length]!;
  joinChannel(next.id);
  client?.playTone("beep");
}

window.addEventListener("message", (event: MessageEvent<LuaMessage>) => {
  const message = event.data;
  switch (message.action) {
    case "init": {
      start(message);
      break;
    }
    case "token": {
      if (message.token && pendingToken) pendingToken(message.token);
      else if (!message.token && pendingTokenError) {
        pendingTokenError(new Error(message.error ?? "No radio access."));
      }
      pendingToken = null;
      pendingTokenError = null;
      break;
    }
    case "ptt": {
      if (!client || !powered) break;
      if (message.on) void client.startTransmit(channelId);
      else client.stopTransmit();
      break;
    }
    case "setChannel": {
      joinChannel(message.channel);
      break;
    }
    case "stepChannel": {
      stepChannel(message.direction);
      break;
    }
    case "earpiece": {
      earpiece = message.on;
      client?.setRadioState({ earpiece });
      render();
      break;
    }
    case "power": {
      setPower(message.on);
      break;
    }
    case "volume": {
      volume = message.volume;
      client?.setVolume(volume);
      render();
      break;
    }
    case "nearby": {
      updateNearby(message.radios);
      break;
    }
    case "tone": {
      client?.playTone(message.tone as "beep");
      break;
    }
    case "open": {
      document.body.classList.add("open");
      void client?.output.resume();
      render();
      break;
    }
    case "close": {
      document.body.classList.remove("open");
      break;
    }
    default: {
      break;
    }
  }
});

// --- the handheld's buttons ---------------------------------------------------------------------

function close() {
  document.body.classList.remove("open");
  void post("close");
}

$("channel-up").addEventListener("click", () => stepChannel(1));
$("channel-down").addEventListener("click", () => stepChannel(-1));
$("power").addEventListener("click", () => setPower(!powered));
$("earpiece").addEventListener("click", () => {
  earpiece = !earpiece;
  client?.setRadioState({ earpiece });
  void post("earpiece", { on: earpiece });
  render();
});
$("volume").addEventListener("input", (event) => {
  volume = Number((event.target as HTMLInputElement).value);
  client?.setVolume(volume);
  void post("volume", { volume });
});
$("close").addEventListener("click", close);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") close();
});

// the side PTT button on the handheld (mouse)
const pttButton = $("ptt");
pttButton.addEventListener("pointerdown", () => {
  if (powered) void client?.startTransmit(channelId);
});
for (const name of ["pointerup", "pointerleave", "pointercancel"]) {
  pttButton.addEventListener(name, () => client?.stopTransmit());
}

render();
void post("loaded");
