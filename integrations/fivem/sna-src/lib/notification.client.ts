/** GTA V feed notifications (the phone-style pop-up above the minimap) */

export enum IconTypes {
  None = 0,
  ChatBox = 1,
  Email = 2,
}

interface NotificationOptions {
  /** a texture such as CHAR_CALL911, CHAR_TAXI, CHAR_PROPERTY_TOWING_IMPOUND */
  picture: string;
  title: string;
  message: string;
  icon?: IconTypes;
  subject?: string;
}

export function createNotification(options: NotificationOptions) {
  // CELL_EMAIL_BCON takes several components, so messages longer than 99 characters fit
  BeginTextCommandThefeedPost("CELL_EMAIL_BCON");
  for (let i = 0; i < options.message.length; i += 99) {
    AddTextComponentSubstringPlayerName(options.message.slice(i, i + 99));
  }
  EndTextCommandThefeedPostMessagetext(
    options.picture,
    options.picture,
    false,
    options.icon ?? IconTypes.None,
    options.title,
    options.subject ?? "",
  );
  EndTextCommandThefeedPostTicker(false, true);
}

/** the player's position, street and heading (for 911 calls, traffic stops) */
export function getPlayerLocation() {
  const ped = PlayerPedId();
  const [x = 0, y = 0, z = 0] = GetEntityCoords(ped, true);
  const [streetHash = 0] = GetStreetNameAtCoord(x, y, z);
  return {
    street: GetStreetNameFromHashKey(streetHash),
    position: { x, y, z, heading: GetEntityHeading(ped) },
  };
}
