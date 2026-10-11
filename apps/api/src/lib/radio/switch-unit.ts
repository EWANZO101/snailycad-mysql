import { prisma } from "lib/data/prisma";
import { radioServer } from "./radio-server";

interface UnitLike {
  userId?: string | null;
  officers?: { userId?: string | null }[];
  deputies?: { userId?: string | null }[];
}

/**
 * Dispatch set a unit's radio channel: switch the radios of everyone in that unit. The value is a
 * radio channel id (new CADs) or a name typed in by dispatch (older CADs), matched case-insensitively.
 */
export async function switchUnitRadios(unit: UnitLike, radioChannel: string) {
  if (!(await radioServer.isEnabled())) return 0;

  const channels = await prisma.radioChannel.findMany({ select: { id: true, name: true } });
  const wanted = radioChannel.trim().toLowerCase();
  const channel =
    channels.find((c) => c.id === radioChannel) ??
    channels.find((c) => c.name.trim().toLowerCase() === wanted);
  if (!channel) return 0;

  const userIds = new Set(
    [
      unit.userId,
      ...(unit.officers ?? []).map((o) => o.userId),
      ...(unit.deputies ?? []).map((d) => d.userId),
    ].filter((id): id is string => !!id),
  );
  let count = 0;
  for (const userId of userIds) count += radioServer.switchUser(userId, channel.id);
  return count;
}
