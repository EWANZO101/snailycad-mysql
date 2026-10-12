import { Events, SnCommands } from "../lib/events";
import { registerServiceCallClient } from "../lib/service-call.client";

registerServiceCallClient({
  command: SnCommands.CallTaxi,
  suggestion: "Contact the taxi services.",
  toClient: Events.TaxiCallToClient,
  toServer: Events.TaxiCallToServer,
  response: Events.TaxiCallToClientResponse,
  picture: "CHAR_TAXI",
  title: "Taxi Service",
  success: "Your call has been reported to any available taxi drivers!",
  failure: "We were unable to process your taxi call at this time.",
});
