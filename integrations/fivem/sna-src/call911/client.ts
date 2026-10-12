import { Events, SnCommands } from "../lib/events";
import { registerServiceCallClient } from "../lib/service-call.client";

registerServiceCallClient({
  command: SnCommands.Call911,
  suggestion: "Contact the emergency services.",
  toClient: Events.Call911ToClient,
  toServer: Events.Call911ToServer,
  response: Events.Call911ToClientResponse,
  picture: "CHAR_CALL911",
  title: "Emergency Services",
  success: "Your call has been reported to the emergency services",
  failure: "We were unable to process your 911 call at this time.",
});
