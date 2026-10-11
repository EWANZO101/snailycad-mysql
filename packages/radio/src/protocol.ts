/* eslint-disable unicorn/number-literal-case -- hex byte masks; prettier lowercases them */
/**
 * SnailyCAD Radio protocol v1. Documented in docs/radio/protocol.md: keep both in sync.
 */

export const RADIO_PROTOCOL_VERSION = 1;
export const RADIO_WS_PATH = "/v1/radio/ws";

/** G.711 mu-law, 16 kHz, mono, 20 ms frames */
export const AUDIO_CODEC_MULAW = 1;
export const AUDIO_SAMPLE_RATE = 16_000;
export const AUDIO_FRAME_MS = 20;
export const AUDIO_FRAME_SAMPLES = (AUDIO_SAMPLE_RATE * AUDIO_FRAME_MS) / 1000;
export const AUDIO_FRAME_HEADER_BYTES = 6;
export const FRAME_TYPE_AUDIO = 1;
/** frames per second a socket may send before frames are dropped */
export const MAX_FRAMES_PER_SECOND = 60;

export type RadioTransport = "builtin" | "livekit";
export type RadioIdentityKind = "dispatcher" | "unit" | "user" | "game" | "external";
export type ChannelMode = "member" | "listen";

export interface RadioIdentity {
  id: string;
  name: string;
  kind: RadioIdentityKind;
  userId?: string | null;
}

export interface RadioChannelInfo {
  id: string;
  name: string;
  frequency?: string | null;
  description?: string | null;
  canTransmit: boolean;
}

export interface RadioMember {
  id: string;
  name: string;
  kind: RadioIdentityKind;
  talking: boolean;
  earpiece: boolean;
  mode: ChannelMode;
}

export interface RadioTokenResponse {
  token: string;
  wsUrl: string;
  transport: RadioTransport;
  livekitUrl: string | null;
  identity: RadioIdentity;
  channels: RadioChannelInfo[];
  audio: { codec: "mulaw"; sampleRate: number; frameMs: number };
}

export interface ExternalTokenRequest {
  name: string;
  identity: string;
  identifiers?: { discordId?: string | null; steamId?: string | null };
  kind?: "game" | "external";
}

// --- messages ---------------------------------------------------------------------------

export type ClientMessage =
  | { t: "hello"; token: string; client?: string }
  | { t: "join"; channel: string; mode?: ChannelMode }
  | { t: "leave"; channel: string }
  | { t: "ptt"; channel: string; on: boolean }
  | { t: "state"; earpiece?: boolean; speaker?: boolean }
  | { t: "ping"; ts?: number };

export type ServerMessage =
  | { t: "ready"; identity: RadioIdentity; channels: RadioChannelInfo[]; transport: RadioTransport }
  | {
      t: "joined";
      channel: string;
      handle: number;
      mode: ChannelMode;
      members: RadioMember[];
      livekit: { room: string; token: string; url: string } | null;
    }
  | { t: "left"; channel: string }
  | { t: "members"; channel: string; members: RadioMember[] }
  | { t: "talk"; channel: string; id: string; name: string; on: boolean }
  | { t: "granted"; channel: string }
  | { t: "busy"; channel: string; by: string }
  | { t: "preempted"; channel: string; by: string }
  | { t: "switch"; channel: string }
  | { t: "tone"; channel: string; tone: string }
  | { t: "channels"; channels: RadioChannelInfo[] }
  | { t: "error"; code: string; message: string; fatal?: boolean }
  | { t: "pong"; ts?: number };

// --- binary audio frames ------------------------------------------------------------------

export interface AudioFrame {
  codec: number;
  handle: number;
  seq: number;
  payload: Uint8Array;
}

export function encodeAudioFrame(handle: number, seq: number, payload: Uint8Array): Uint8Array {
  const frame = new Uint8Array(AUDIO_FRAME_HEADER_BYTES + payload.length);
  frame[0] = FRAME_TYPE_AUDIO;
  frame[1] = AUDIO_CODEC_MULAW;
  frame[2] = (handle >> 8) & 0xff;
  frame[3] = handle & 0xff;
  frame[4] = (seq >> 8) & 0xff;
  frame[5] = seq & 0xff;
  frame.set(payload, AUDIO_FRAME_HEADER_BYTES);
  return frame;
}

export function decodeAudioFrame(data: Uint8Array): AudioFrame | null {
  if (data.length <= AUDIO_FRAME_HEADER_BYTES || data[0] !== FRAME_TYPE_AUDIO) return null;
  return {
    codec: data[1]!,
    handle: (data[2]! << 8) | data[3]!,
    seq: (data[4]! << 8) | data[5]!,
    payload: data.subarray(AUDIO_FRAME_HEADER_BYTES),
  };
}

/** the same frame with another handle: the server rewrites it per receiving socket */
export function withHandle(frame: Uint8Array, handle: number): Uint8Array {
  const copy = new Uint8Array(frame);
  copy[2] = (handle >> 8) & 0xff;
  copy[3] = handle & 0xff;
  return copy;
}

export function parseClientMessage(text: string): ClientMessage | null {
  try {
    const value = JSON.parse(text) as unknown;
    if (!value || typeof value !== "object" || typeof (value as { t?: unknown }).t !== "string") {
      return null;
    }
    return value as ClientMessage;
  } catch {
    return null;
  }
}

/** LiveKit room name of a channel */
export function livekitRoomName(channelId: string) {
  return `snaily-radio-${channelId}`;
}
