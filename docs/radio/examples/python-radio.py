#!/usr/bin/env python3
"""A minimal SnailyCAD radio integration in Python (needs the `websockets` package).

Joins a channel, prints who talks, records what it hears to a WAV file, and can transmit a
16 kHz mono WAV file. A starting point for a Discord bot, a hardware radio gateway, a logger...

    pip install websockets
    CAD_API=https://cad-api.example.com/v1 CAD_API_TOKEN=... python3 python-radio.py "Dispatch 1" [--send file.wav] [--record out.wav]

Protocol: docs/radio/protocol.md
"""
import argparse
import asyncio
import json
import os
import struct
import urllib.request
import wave

import websockets


def mulaw_decode(byte: int) -> int:
    byte = ~byte & 0xFF
    sign = byte & 0x80
    exponent = (byte >> 4) & 0x07
    sample = ((((byte & 0x0F) << 3) + 0x84) << exponent) - 0x84
    return -sample if sign else sample


def mulaw_encode(sample: int) -> int:
    sample = max(-32768, min(32767, sample))
    sign = 0x80 if sample < 0 else 0
    sample = min(abs(sample), 32635) + 0x84
    exponent = 7
    mask = 0x4000
    while sample & mask == 0 and exponent > 0:
        exponent -= 1
        mask >>= 1
    return ~(sign | (exponent << 4) | ((sample >> (exponent + 3)) & 0x0F)) & 0xFF


def get_token(api: str, api_token: str) -> dict:
    request = urllib.request.Request(
        f"{api}/radio/external/token",
        data=json.dumps({"name": "Python example", "identity": "example:python-radio", "kind": "external"}).encode(),
        headers={"Content-Type": "application/json", "snaily-cad-api-token": api_token},
        method="POST",
    )
    with urllib.request.urlopen(request) as response:
        return json.load(response)


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("channel", nargs="?", default="Dispatch 1")
    parser.add_argument("--send", help="16 kHz mono 16-bit WAV file to transmit")
    parser.add_argument("--record", help="write received audio to this WAV file")
    parser.add_argument("--seconds", type=float, default=10, help="how long to stay connected")
    args = parser.parse_args()

    radio = get_token(os.environ["CAD_API"], os.environ["CAD_API_TOKEN"])
    channel = next((c for c in radio["channels"] if c["name"] == args.channel), None)
    if not channel:
        raise SystemExit(f"No channel {args.channel!r}: {[c['name'] for c in radio['channels']]}")

    recording = None
    if args.record:
        recording = wave.open(args.record, "wb")
        recording.setnchannels(1)
        recording.setsampwidth(2)
        recording.setframerate(16000)

    async with websockets.connect(radio["wsUrl"]) as ws:
        async def send(message):
            await ws.send(json.dumps(message))

        await send({"t": "hello", "token": radio["token"], "client": "python-example/1.0"})
        handle = None

        async def transmit():
            with wave.open(args.send, "rb") as wav:
                if wav.getframerate() != 16000 or wav.getnchannels() != 1 or wav.getsampwidth() != 2:
                    raise SystemExit("Use a 16 kHz mono 16-bit WAV file.")
                pcm = wav.readframes(wav.getnframes())
            samples = struct.unpack(f"<{len(pcm) // 2}h", pcm)
            for seq, start in enumerate(range(0, len(samples), 320)):
                chunk = samples[start:start + 320]
                chunk = list(chunk) + [0] * (320 - len(chunk))
                frame = bytes([1, 1]) + struct.pack(">HH", handle, seq & 0xFFFF) + bytes(mulaw_encode(s) for s in chunk)
                await ws.send(frame)
                await asyncio.sleep(0.02)  # real time: one 20 ms frame every 20 ms
            await send({"t": "ptt", "channel": channel["id"], "on": False})
            print("sent", args.send)

        async def receive():
            nonlocal handle
            async for data in ws:
                if isinstance(data, bytes):
                    if recording and len(data) > 6 and data[0] == 1:
                        recording.writeframes(struct.pack(f"<{len(data) - 6}h", *(mulaw_decode(b) for b in data[6:])))
                    continue
                message = json.loads(data)
                kind = message["t"]
                if kind == "ready":
                    await send({"t": "join", "channel": channel["id"], "mode": "member"})
                elif kind == "joined":
                    handle = message["handle"]
                    print("joined", args.channel, "members:", ", ".join(m["name"] for m in message["members"]))
                    if args.send:
                        await send({"t": "ptt", "channel": channel["id"], "on": True})
                elif kind == "granted":
                    asyncio.create_task(transmit())
                elif kind == "busy":
                    print("busy:", message["by"], "is talking")
                elif kind == "talk":
                    print(message["name"], "started" if message["on"] else "stopped", "talking")
                elif kind == "error":
                    print("error:", message["code"], message["message"])

        try:
            await asyncio.wait_for(receive(), timeout=args.seconds)
        except asyncio.TimeoutError:
            pass

    if recording:
        recording.close()
        print("recorded to", args.record)


if __name__ == "__main__":
    asyncio.run(main())
