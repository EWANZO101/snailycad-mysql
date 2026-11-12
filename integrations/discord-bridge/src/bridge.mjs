import { PassThrough } from "node:stream";
import {
  AudioPlayerStatus,
  EndBehaviorType,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
} from "@discordjs/voice";
import prism from "prism-media";
import { FrameChunker, discordToRadio, radioToDiscord, toneForDiscord } from "./audio.mjs";
import { RadioSession } from "./radio.mjs";

/** a Discord speaker's radio connection is closed after this long without talking */
const SPEAKER_IDLE_MS = 10 * 60_000;
/** audio kept while waiting for the radio to grant the channel (~1 s) */
const MAX_QUEUED_FRAMES = 50;

/**
 * Links one Discord voice channel to one SnailyCAD radio channel, both ways:
 * - radio -> Discord: the bridge's own radio connection plays what it hears into the voice channel
 * - Discord -> radio: everyone who talks in the voice channel transmits on the radio with their
 *   own name, through a radio connection linked to their Discord account (so the CAD applies
 *   that user's channel access)
 */
export class Bridge {
  #client;
  #config;
  #log;
  #connection = null;
  #player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
  #listener = null;
  /** Discord userId -> { session, idleTimer } */
  #speakers = new Map();
  /** radio identity ids of our own speaker connections: their audio isn't played back */
  #ownIds = new Set();
  #stream = null;
  #suppress = false;
  #upsampleState = { last: 0 };
  #stopped = false;

  /**
   * @param {import("discord.js").Client} client a logged-in client
   * @param {{ guildId: string, voiceChannelId: string, radioChannel: string, name?: string,
   *   talkFromDiscord?: boolean, allowedRoleIds?: string[], volume?: number, cadApi: string,
   *   cadApiToken: string }} config
   */
  constructor(client, config, log = console) {
    this.#client = client;
    this.#config = config;
    this.#log = {
      info: (message) => log.info(`[${this.label}] ${message}`),
      warn: (message) => log.warn(`[${this.label}] ${message}`),
      error: (message) => log.error(`[${this.label}] ${message}`),
    };
    this.#player.on("error", (error) => this.#log.warn(`playback: ${error.message}`));
  }

  get label() {
    return `${this.#config.name ?? "bridge"} ⇄ ${this.#config.radioChannel}`;
  }

  async start() {
    const guild = await this.#client.guilds.fetch(this.#config.guildId);
    const channel = await guild.channels.fetch(this.#config.voiceChannelId);
    if (!channel?.isVoiceBased()) {
      throw new Error(`${this.#config.voiceChannelId} isn't a voice channel in ${guild.name}`);
    }

    this.#listener = this.#radioSession({
      name: `${this.#config.name ?? channel.name} (Discord)`,
      identity: `discord-bridge:${guild.id}:${channel.id}`,
    });
    this.#listener.on("talk", (talk) => this.#onRadioTalk(talk));
    this.#listener.on("audio", (pcm) => this.#onRadioAudio(pcm));
    this.#listener.on("joined", () => this.#log.info("connected to the radio"));
    this.#listener.on("fatal", (error) => this.#log.error(error.message));
    await this.#listener.connect();

    this.#connect(guild, channel);
  }

  #connect(guild, channel) {
    const connection = joinVoiceChannel({
      guildId: guild.id,
      channelId: channel.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });
    this.#connection = connection;
    connection.subscribe(this.#player);

    connection.on(VoiceConnectionStatus.Ready, () => {
      this.#log.info(`in Discord voice channel #${channel.name}`);
    });
    // the recipe from the @discordjs/voice docs: a move between channels / regions reconnects by
    // itself, anything else gets a fresh connection
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        connection.destroy();
        if (!this.#stopped) {
          this.#log.warn("lost the Discord voice connection, rejoining in 5 s");
          setTimeout(() => !this.#stopped && this.#connect(guild, channel), 5_000);
        }
      }
    });

    if (this.#config.talkFromDiscord !== false) {
      connection.receiver.speaking.on("start", (userId) => void this.#onDiscordSpeaking(userId));
    }
  }

  // --- radio -> Discord ----------------------------------------------------------------------

  #onRadioTalk({ id, name, on }) {
    if (on) {
      this.#suppress = this.#ownIds.has(id);
      if (!this.#suppress) this.#log.info(`radio: ${name} talking`);
      return;
    }
    this.#endStream();
    this.#suppress = false;
  }

  #onRadioAudio(pcm) {
    if (this.#suppress) return;
    if (!this.#stream) {
      this.#stream = new PassThrough();
      this.#upsampleState = { last: 0 };
      this.#player.play(createAudioResource(this.#stream, { inputType: StreamType.Raw }));
    }
    this.#stream.write(radioToDiscord(pcm, this.#config.volume ?? 1, this.#upsampleState));
  }

  #endStream() {
    this.#stream?.end();
    this.#stream = null;
  }

  /** a short beep into the voice channel, e.g. when the radio channel is busy */
  #beep(frequency = 440, ms = 180) {
    if (this.#stream || this.#player.state.status === AudioPlayerStatus.Playing) return;
    const stream = new PassThrough();
    this.#player.play(createAudioResource(stream, { inputType: StreamType.Raw }));
    stream.end(toneForDiscord(frequency, ms));
  }

  // --- Discord -> radio ----------------------------------------------------------------------

  async #onDiscordSpeaking(userId) {
    const receiver = this.#connection?.receiver;
    if (!receiver || userId === this.#client.user?.id || receiver.subscriptions.has(userId)) return;

    const member = await this.#member(userId);
    if (!member || member.user.bot) return;
    if (!this.#mayTalk(member)) return;

    const speaker = this.#speaker(member);
    const session = speaker.session;
    clearTimeout(speaker.idleTimer);

    const opus = receiver.subscribe(userId, {
      end: { behavior: EndBehaviorType.AfterSilence, duration: 400 },
    });
    const decoder = new prism.opus.Decoder({ rate: 48_000, channels: 2, frameSize: 960 });
    const chunker = new FrameChunker();
    const queue = [];
    let busy = false;

    const onGranted = () => {
      for (const frame of queue.splice(0)) session.sendFrame(frame);
    };
    const onBusy = (by) => {
      busy = true;
      queue.length = 0;
      this.#log.info(`${member.displayName} can't talk: ${by ?? "someone"} is on the radio`);
      this.#beep(300, 250);
    };
    session.on("granted", onGranted);
    session.once("busy", onBusy);
    session.once("preempted", onBusy);
    session.talk(true);

    decoder.on("data", (chunk) => {
      if (busy) return;
      for (const frame of chunker.push(discordToRadio(chunk))) {
        if (session.granted) session.sendFrame(frame);
        else {
          queue.push(frame);
          if (queue.length > MAX_QUEUED_FRAMES) queue.shift();
        }
      }
    });

    const finish = () => {
      const last = chunker.flush();
      if (last && session.granted && !busy) session.sendFrame(last);
      session.off("granted", onGranted);
      session.off("busy", onBusy);
      session.off("preempted", onBusy);
      session.talk(false);
      speaker.idleTimer = setTimeout(() => this.#dropSpeaker(userId), SPEAKER_IDLE_MS);
    };
    decoder.once("end", finish);
    opus.once("error", (error) =>
      this.#log.warn(`receive ${member.displayName}: ${error.message}`),
    );
    decoder.on("error", (error) =>
      this.#log.warn(`decode ${member.displayName}: ${error.message}`),
    );
    opus.pipe(decoder);
  }

  async #member(userId) {
    try {
      const guild = await this.#client.guilds.fetch(this.#config.guildId);
      return await guild.members.fetch(userId);
    } catch {
      return null;
    }
  }

  #mayTalk(member) {
    const roles = this.#config.allowedRoleIds ?? [];
    return !roles.length || roles.some((id) => member.roles.cache.has(id));
  }

  #speaker(member) {
    let speaker = this.#speakers.get(member.id);
    if (speaker) return speaker;

    const session = this.#radioSession({
      name: member.displayName,
      identity: `discord:${member.id}`,
      identifiers: { discordId: member.id },
    });
    session.on("ready", () => {
      if (session.identityId) this.#ownIds.add(session.identityId);
    });
    session.on("fatal", (error) => {
      this.#log.warn(`${member.displayName} can't use the radio: ${error.message}`);
      this.#dropSpeaker(member.id);
    });
    speaker = { session, idleTimer: null };
    this.#speakers.set(member.id, speaker);
    void session.connect();
    return speaker;
  }

  #dropSpeaker(userId) {
    const speaker = this.#speakers.get(userId);
    if (!speaker) return;
    clearTimeout(speaker.idleTimer);
    if (speaker.session.identityId) this.#ownIds.delete(speaker.session.identityId);
    speaker.session.close();
    this.#speakers.delete(userId);
  }

  #radioSession({ name, identity, identifiers }) {
    const session = new RadioSession({
      api: this.#config.cadApi,
      apiToken: this.#config.cadApiToken,
      channel: this.#config.radioChannel,
      name,
      identity,
      identifiers,
    });
    session.on("error", (error) => this.#log.warn(`radio (${name}): ${error.message}`));
    return session;
  }

  stop() {
    this.#stopped = true;
    this.#endStream();
    for (const userId of [...this.#speakers.keys()]) this.#dropSpeaker(userId);
    this.#listener?.close();
    this.#player.stop(true);
    this.#connection?.destroy();
  }
}
