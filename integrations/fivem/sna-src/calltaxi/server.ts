import { Events, SnCommands } from "../lib/events";
import { registerServiceCall } from "../lib/service-call.server";
import "../lib/startup.server";

registerServiceCall({
  command: SnCommands.CallTaxi,
  toClient: Events.TaxiCallToClient,
  toServer: Events.TaxiCallToServer,
  response: Events.TaxiCallToClientResponse,
  path: "/taxi",
  extraData: () => ({ creatorId: null }),
});
