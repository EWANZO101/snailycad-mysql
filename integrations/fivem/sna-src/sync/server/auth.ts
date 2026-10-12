/**
 * /sn-auth, /sn-whoami, /sn-logout.
 *
 * original edition:        the player pastes their personal API token into the NUI. The server
 *                          checks it with the CAD and keeps it in this resource's KVP storage.
 * snailycad-mysql edition: nothing to paste. The CAD finds the player by their Discord / Steam
 *                          account, so these commands only explain how linking works.
 */
import { cadRequest, getLicense, tokenKvpKey } from "../../lib/cad.server";
import { getEdition } from "../../lib/config.server";
import { ClientEvents, ServerEvents, SnCommands } from "../../lib/events";
import { chat, getPlayerUser, throttled } from "../../lib/player.server";
import { flowResult, netSource } from "./common";

const LINK_HELP =
  "In the CAD, link Discord or Steam under ^5Account > Connections^7. This server signs you in with that account.";

RegisterCommand(
  SnCommands.WhoAmI,
  async (source: number) => {
    const player = Number(source);
    if (player <= 0) return;

    const result = await getPlayerUser(player);
    if (!result) return;
    chat(player, `Your SnailyCAD username is ^5${result.user.username}^7.`);
  },
  false,
);

RegisterCommand(
  SnCommands.Logout,
  async (source: number) => {
    const player = Number(source);
    if (player <= 0) return;

    if ((await getEdition()) === "snailycad-mysql") {
      chat(
        player,
        "This server signs you in with your linked Discord / Steam account. To sign out, unlink it in the CAD under ^5Account > Connections^7.",
      );
      return;
    }

    const license = getLicense(player);
    if (!license || !GetResourceKvpString(tokenKvpKey(license))) {
      chat(player, "Please make sure you're authenticated. Use: ^5/sn-auth^7.");
      return;
    }

    DeleteResourceKvp(tokenKvpKey(license));
    chat(player, "Successfully logged out this player from your SnailyCAD account.");
  },
  false,
);

RegisterCommand(
  SnCommands.Auth,
  async (source: number) => {
    const player = Number(source);
    if (player <= 0) return;

    if ((await getEdition()) === "snailycad-mysql") {
      const result = await getPlayerUser(player, { silent: true });
      chat(
        player,
        result
          ? `You're already signed in as ^5${result.user.username}^7 through your linked account.`
          : LINK_HELP,
      );
      return;
    }

    emitNet(ClientEvents.RequestAuthFlow, player);
  },
  false,
);

/** original edition: { token } from the NUI */
onNet(ServerEvents.OnUserSave, async (data: unknown) => {
  const player = netSource();
  if (!player) return;
  if (throttled("auth", player, 3_000)) {
    flowResult(player, "auth", false, "Please wait a moment before trying again.");
    return;
  }

  if ((await getEdition()) === "snailycad-mysql") {
    flowResult(player, "auth", false, "This server doesn't use personal API tokens.");
    return;
  }

  const token =
    data && typeof data === "object" && "token" in data && typeof data.token === "string"
      ? data.token.trim()
      : "";
  if (!token || token.length > 512) {
    flowResult(player, "auth", false, "Enter your Personal API Token.");
    return;
  }

  const license = getLicense(player);
  if (!license) {
    flowResult(
      player,
      "auth",
      false,
      "FiveM didn't give your license identifier. Rejoin and try again.",
    );
    return;
  }

  const result = await cadRequest({
    path: "/user/api-token/validate",
    method: "POST",
    data: { token },
    auth: { type: "none" },
    quiet: true,
  });

  if (!result.ok) {
    flowResult(
      player,
      "auth",
      false,
      result.status === 0
        ? "SnailyCAD can't be reached right now. Please try again later."
        : result.errorMessage === "invalidToken" || result.status === 400 || result.status === 404
          ? "An invalid Personal API Token was provided."
          : "Could not verify your Personal API Token.",
    );
    return;
  }

  SetResourceKvp(tokenKvpKey(license), token);
  flowResult(player, "auth", true, "You have successfully authenticated with SnailyCAD.");
});
