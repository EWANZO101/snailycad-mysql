import { allPermissions, hasPermission, type PartialUser } from "@snailycad/permissions";
import { Forbidden } from "@tsed/exceptions";

export const CANNOT_MANAGE_PERMISSION_ERROR = "cannotManagePermissionYouDoNotHave";

type PermissionsHolder = {
  permissions: string[];
  roles?: { permissions: string[] }[] | null;
};

/**
 * get all the effective permissions of a user (directly assigned + via custom roles).
 * only known permissions are returned.
 */
export function getEffectivePermissions(user: PermissionsHolder): Set<string> {
  const permissions = [
    ...(user.permissions ?? []),
    ...(user.roles ?? []).flatMap((role) => role.permissions),
  ];

  return new Set(permissions.filter((permission) => allPermissions.includes(permission)));
}

/**
 * returns the permissions in `permissions` that the `actor` does not hold.
 * owners (and users holding every permission) are never restricted.
 */
export function getPermissionsActorLacks(
  actor: PartialUser,
  permissions: Iterable<string>,
): string[] {
  const lacking: string[] = [];

  for (const permission of permissions) {
    if (!allPermissions.includes(permission)) continue;
    if (!hasPermission({ userToCheck: actor, permissionsToCheck: [permission] })) {
      lacking.push(permission);
    }
  }

  return lacking;
}

/**
 * throws when the `actor` attempts to add or remove a permission they do not hold themselves.
 * @param previous - the permissions before the change
 * @param next - the permissions after the change
 */
export function assertCanChangePermissions(options: {
  actor: PartialUser;
  previous: Iterable<string>;
  next: Iterable<string>;
}) {
  const previous = new Set(options.previous);
  const next = new Set(options.next);

  const changed = new Set<string>();
  for (const permission of previous) {
    if (!next.has(permission)) changed.add(permission);
  }
  for (const permission of next) {
    if (!previous.has(permission)) changed.add(permission);
  }

  assertActorHoldsPermissions(options.actor, changed);
}

/**
 * throws when the `actor` does not hold every (known) permission in `permissions`.
 */
export function assertActorHoldsPermissions(actor: PartialUser, permissions: Iterable<string>) {
  const lacking = getPermissionsActorLacks(actor, permissions);

  if (lacking.length > 0) {
    throw new Forbidden(CANNOT_MANAGE_PERMISSION_ERROR);
  }
}
