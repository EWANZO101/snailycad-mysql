/**
 * Audio over a LiveKit server (transport "livekit"): one LiveKit room per radio channel. Control
 * (PTT, talk indicators, busy) still goes over the SnailyCAD WebSocket. livekit-client is loaded
 * on demand, so the built-in transport never downloads it.
 */

import type * as LiveKit from "livekit-client";

interface LiveKitRoom {
  connect(url: string, token: string, options?: { autoSubscribe?: boolean }): Promise<void>;
  disconnect(): Promise<void> | void;
  on(event: string, listener: (...args: any[]) => void): unknown;
  localParticipant: { setMicrophoneEnabled(enabled: boolean): Promise<unknown> };
}

interface RemoteAudioTrack {
  kind: string;
  attach(): HTMLMediaElement;
  detach(): HTMLMediaElement[];
  setVolume?(volume: number): void;
}

interface ChannelRoom {
  room: LiveKitRoom;
  tracks: Set<RemoteAudioTrack>;
  volume: number;
}

export class LiveKitAudio {
  #rooms = new Map<string, ChannelRoom>();
  #module: Promise<typeof LiveKit> | null = null;
  #container: HTMLElement | null = null;

  #load() {
    this.#module ??= import("livekit-client");
    return this.#module;
  }

  #element() {
    if (!this.#container) {
      this.#container = document.createElement("div");
      this.#container.style.display = "none";
      this.#container.dataset.snailyRadio = "livekit";
      document.body.appendChild(this.#container);
    }
    return this.#container;
  }

  async join(channel: string, url: string, token: string) {
    await this.leave(channel);
    const livekit = await this.#load();
    const room = new livekit.Room({
      adaptiveStream: false,
      dynacast: false,
    }) as unknown as LiveKitRoom;
    const entry: ChannelRoom = { room, tracks: new Set(), volume: 1 };
    this.#rooms.set(channel, entry);

    room.on(livekit.RoomEvent.TrackSubscribed, (track: RemoteAudioTrack) => {
      if (track.kind !== livekit.Track.Kind.Audio) return;
      const element = track.attach();
      this.#element().appendChild(element);
      track.setVolume?.(entry.volume);
      entry.tracks.add(track);
    });
    room.on(livekit.RoomEvent.TrackUnsubscribed, (track: RemoteAudioTrack) => {
      for (const element of track.detach()) element.remove();
      entry.tracks.delete(track);
    });
    await room.connect(url, token, { autoSubscribe: true });
    // joined again (or left) while connecting: this room was replaced, don't play it twice
    if (this.#rooms.get(channel) !== entry) {
      for (const track of entry.tracks) for (const element of track.detach()) element.remove();
      await room.disconnect();
    }
  }

  async leave(channel: string) {
    const entry = this.#rooms.get(channel);
    if (!entry) return;
    this.#rooms.delete(channel);
    for (const track of entry.tracks) for (const element of track.detach()) element.remove();
    await entry.room.disconnect();
  }

  async setTransmitting(channel: string, on: boolean) {
    await this.#rooms.get(channel)?.room.localParticipant.setMicrophoneEnabled(on);
  }

  setVolume(channel: string, volume: number) {
    const entry = this.#rooms.get(channel);
    if (!entry) return;
    entry.volume = volume;
    for (const track of entry.tracks) track.setVolume?.(volume);
  }

  async close() {
    await Promise.all([...this.#rooms.keys()].map((channel) => this.leave(channel)));
    this.#container?.remove();
    this.#container = null;
  }
}
