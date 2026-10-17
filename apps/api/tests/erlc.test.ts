import { generateKeyPairSync, sign } from "node:crypto";
import { expect, test } from "vitest";
import { isKeyRejected, isServerOffline, parsePlayer } from "../src/lib/erlc/client";
import { verifyErlcSignature } from "../src/lib/erlc/webhook-signature";
import { clampPollSeconds, getTargetForTeam } from "../src/lib/erlc/settings";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");

function signed(body: string, timestamp: string) {
  const signature = sign(
    null,
    Buffer.concat([Buffer.from(timestamp), Buffer.from(body)]),
    privateKey,
  );
  return { timestamp, signatureHex: signature.toString("hex"), rawBody: Buffer.from(body) };
}

test("Should accept an ER:LC webhook signed over timestamp + raw body", () => {
  const now = 1_760_000_000_000;
  const request = signed(JSON.stringify({ event: "EmergencyCall" }), String(now / 1000));
  expect(verifyErlcSignature({ ...request, key: publicKey, now })).toBe(true);
});

test("Should refuse a changed body, a wrong key or an old timestamp", () => {
  const now = 1_760_000_000_000;
  const request = signed(JSON.stringify({ a: 1 }), String(now / 1000));
  expect(
    verifyErlcSignature({
      ...request,
      rawBody: Buffer.from(JSON.stringify({ a: 2 })),
      key: publicKey,
      now,
    }),
  ).toBe(false);
  expect(verifyErlcSignature({ ...request, now })).toBe(false);
  expect(verifyErlcSignature({ ...request, key: publicKey, now: now + 10 * 60 * 1000 })).toBe(
    false,
  );
  expect(verifyErlcSignature({ ...request, signatureHex: "zz", key: publicKey, now })).toBe(false);
  expect(verifyErlcSignature({ ...request, timestamp: undefined, key: publicKey, now })).toBe(
    false,
  );
});

test("Should load ER:LC's published public key", () => {
  // a real key that doesn't throw while parsing, and refuses our own signature
  const now = Date.now();
  const request = signed("{}", String(Math.floor(now / 1000)));
  expect(verifyErlcSignature({ ...request, now })).toBe(false);
});

test("Should split ER:LC player strings", () => {
  expect(parsePlayer("Black_Hallow:54249787")).toEqual({ name: "Black_Hallow", id: "54249787" });
  expect(parsePlayer("NoId")).toEqual({ name: "NoId", id: null });
  expect(parsePlayer(null)).toBe(null);
});

test("Should map teams case-insensitively, unknown teams to LEO", () => {
  expect(getTargetForTeam({ teamMap: null }, "Fire")).toBe("CALL_911_EMS_FD");
  expect(getTargetForTeam({ teamMap: null }, "police")).toBe("CALL_911_LEO");
  expect(getTargetForTeam({ teamMap: null }, "DOT")).toBe("TOW");
  expect(getTargetForTeam({ teamMap: null }, "Civilian")).toBe("CALL_911_LEO");
  expect(getTargetForTeam({ teamMap: { DOT: "IGNORE" } }, "DOT")).toBe("IGNORE");
});

test("Should tell key errors and an empty server apart", () => {
  expect(isKeyRejected({ status: 403, code: 2002 })).toBe(true);
  expect(isKeyRejected({ status: 403, code: null })).toBe(true);
  expect(isKeyRejected({ status: 403, code: 4002 })).toBe(false);
  expect(isServerOffline({ status: 422, code: 3002 })).toBe(true);
  expect(isServerOffline({ status: 200, code: null })).toBe(false);
});

test("Should keep the poll interval between 10 and 300 seconds", () => {
  expect(clampPollSeconds(1)).toBe(10);
  expect(clampPollSeconds(1000)).toBe(300);
  expect(clampPollSeconds(null)).toBe(15);
  expect(clampPollSeconds(20)).toBe(20);
});
