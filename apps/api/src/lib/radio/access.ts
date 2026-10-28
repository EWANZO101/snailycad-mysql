import { Permissions, hasPermission } from "@snailycad/permissions";
import type { RadioChannelInfo, RadioIdentity } from "@snailycad/radio";
import { prisma } from "lib/data/prisma";
import type { RadioTokenClaims } from "./tokens";

export interface ChannelAccess {
  /** can join as a member (shown in the channel list) */
  member: boolean;
  /** can transmit when joined as a member */
  transmit: boolean;
  /** can join in listen-only mode */
  listen: boolean;
}

export interface RadioAccess {
  identity: RadioIdentity;
  /** dispatchers: all channels, and they take over a channel when they talk */
  priority: boolean;
  channels: Map<string, ChannelAccess>;
  /** the channel list this identity sees, in admin order */
  visible: RadioChannelInfo[];
}

const userSelect = {
  id: true,
  username: true,
  rank: true,
  permissions: true,
  roles: { select: { permissions: true } },
} as const;

type RadioUser = NonNullable<Awaited<ReturnType<typeof findRadioUser>>>;

export function findRadioUser(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: userSelect });
}

function asPartialUser(user: RadioUser) {
  return {
    rank: user.rank,
    permissions: (Array.isArray(user.permissions) ? user.permissions : []) as string[],
    roles: user.roles.map((role) => ({
      permissions: (Array.isArray(role.permissions) ? role.permissions : []) as string[],
    })),
  };
}

/** dispatchers and CAD admins: every channel, and they take over a busy channel */
export function isDispatcher(user: RadioUser) {
  return hasPermission({
    userToCheck: asPartialUser(user),
    permissionsToCheck: [Permissions.Dispatch, Permissions.ManageCADSettings],
  });
}

export function hasRadioAccess(user: RadioUser) {
  return hasPermission({
    userToCheck: asPartialUser(user),
    permissionsToCheck: [Permissions.Dispatch, Permissions.Leo, Permissions.EmsFd, Permissions.Dot],
  });
}

/** department ids of all the user's LEO, EMS-FD and DOT units */
async function userDepartments(userId: string) {
  const [officers, deputies, dotWorkers] = await Promise.all([
    prisma.officer.findMany({ where: { userId }, select: { departmentId: true } }),
    prisma.emsFdDeputy.findMany({ where: { userId }, select: { departmentId: true } }),
    prisma.dotWorker.findMany({ where: { userId }, select: { departmentId: true } }),
  ]);
  return new Set(
    [...officers, ...deputies, ...dotWorkers]
      .map((unit) => unit.departmentId)
      .filter((id): id is string => !!id),
  );
}

/** finds the CAD user a game player / external radio user belongs to */
export async function findLinkedUserId(identifiers?: {
  discordId?: string | null;
  steamId?: string | null;
}) {
  const or = [
    identifiers?.discordId ? { discordId: identifiers.discordId } : null,
    identifiers?.steamId ? { steamId: identifiers.steamId } : null,
  ].filter((v): v is NonNullable<typeof v> => v !== null);
  if (!or.length) return null;
  const user = await prisma.user.findFirst({ where: { OR: or }, select: { id: true } });
  return user?.id ?? null;
}

export async function resolveRadioAccess(claims: RadioTokenClaims): Promise<RadioAccess | null> {
  const channels = await prisma.radioChannel.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { departments: { select: { id: true } } },
  });

  const user = claims.uid ? await findRadioUser(claims.uid) : null;
  if (claims.uid && !user) return null;

  const dispatcher = !!user && isDispatcher(user);
  const unitAccess = !!user && hasRadioAccess(user);
  const departments = user && unitAccess ? await userDepartments(user.id) : new Set<string>();
  for (const id of claims.dep ?? []) departments.add(id);
  // a linked game player or external radio user without CAD radio permissions still gets the
  // access their integration granted (dep), like an unlinked one
  const external = claims.kind === "game" || claims.kind === "external";

  const access = new Map<string, ChannelAccess>();
  const visible: RadioChannelInfo[] = [];

  for (const channel of channels) {
    const restricted = channel.departments.length > 0;
    const inDepartment = channel.departments.some((d) => departments.has(d.id));

    let member: boolean;
    if (dispatcher) {
      member = true;
    } else if (unitAccess) {
      member = !restricted || inDepartment;
    } else if (external) {
      member = channel.allowExternal && (!restricted || inDepartment);
    } else {
      member = false;
    }

    // a listen-only token (a player without a radio) never joins a channel as a member
    if (claims.lo) member = false;
    const transmit = member && (dispatcher || !channel.receiveOnly);
    // positional audio: a game player may overhear any radio near them, except on channels
    // that are closed to game servers / outside radios
    const listen = member || (claims.prox === true && channel.allowExternal);

    if (!member && !listen) continue;
    access.set(channel.id, { member, transmit, listen });
    if (member) {
      visible.push({
        id: channel.id,
        name: channel.name,
        frequency: channel.frequency,
        description: channel.description,
        canTransmit: transmit,
      });
    }
  }

  return {
    identity: {
      id: claims.sub,
      name: claims.nm,
      kind: dispatcher ? "dispatcher" : claims.kind,
      userId: user?.id ?? null,
    },
    priority: dispatcher,
    channels: access,
    visible,
  };
}
