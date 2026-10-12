import { Events, SnCommands } from "../lib/events";
import { registerServiceCall } from "../lib/service-call.server";
import "../lib/startup.server";

registerServiceCall({
  command: SnCommands.CallTow,
  toClient: Events.TowCallToClient,
  toServer: Events.TowCallToServer,
  response: Events.TowCallToClientResponse,
  path: "/tow",
  extraData: () => ({ creatorId: null }),
});
