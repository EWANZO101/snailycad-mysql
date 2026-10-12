import { createNotification, getPlayerLocation, IconTypes } from "./notification.client";

export interface ServiceCallClientOptions {
  command: string;
  suggestion: string;
  toClient: string;
  toServer: string;
  response: string;
  picture: string;
  title: string;
  success: string;
  failure: string;
}

export function registerServiceCallClient(options: ServiceCallClientOptions) {
  emit("chat:addSuggestion", `/${options.command}`, options.suggestion, [
    { name: "description", help: "The description of the call" },
  ]);

  // the server asks for our position after the command
  onNet(options.toClient, () => {
    const { street, position } = getPlayerLocation();
    emitNet(options.toServer, { street, position });
  });

  onNet(options.response, (state: "failed" | "success") => {
    const ok = state === "success";
    createNotification({
      picture: options.picture,
      icon: IconTypes.ChatBox,
      title: ok ? options.title : "Failed to report call",
      message: ok ? options.success : options.failure,
    });
  });
}
