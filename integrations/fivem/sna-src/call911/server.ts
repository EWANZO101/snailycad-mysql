import { Events, SnCommands } from "../lib/events";
import { registerServiceCall } from "../lib/service-call.server";
import "../lib/startup.server";

registerServiceCall({
  command: SnCommands.Call911,
  toClient: Events.Call911ToClient,
  toServer: Events.Call911ToServer,
  response: Events.Call911ToClientResponse,
  path: "/911-calls",
  extraData: (position) =>
    position
      ? {
          gtaMapPosition: {
            x: position.x,
            y: position.y,
            z: position.z,
            heading: position.heading ?? 0,
          },
        }
      : {},
});
