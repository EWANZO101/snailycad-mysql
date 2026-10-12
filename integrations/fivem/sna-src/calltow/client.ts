import { Events, SnCommands } from "../lib/events";
import { registerServiceCallClient } from "../lib/service-call.client";

registerServiceCallClient({
  command: SnCommands.CallTow,
  suggestion: "Contact the tow services.",
  toClient: Events.TowCallToClient,
  toServer: Events.TowCallToServer,
  response: Events.TowCallToClientResponse,
  picture: "CHAR_PROPERTY_TOWING_IMPOUND",
  title: "Tow Truck Service",
  success: "Your call has been reported to any available tow drivers!",
  failure: "We were unable to process your tow call at this time.",
});
