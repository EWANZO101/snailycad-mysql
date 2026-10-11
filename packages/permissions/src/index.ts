import * as defaultPermissions from "./defaults";
import { allPermissions, type Permissions } from "./permissions";

export * from "./permissions";

/**
 * permissions are a string array; the MySQL/MariaDB edition stores them in a JSON column, so a
 * user straight from the database has them typed as JSON. Both are accepted.
 */
type PermissionList = (Permissions | string)[] | unknown;

export interface PartialUser {
  rank: "OWNER" | "ADMIN" | "USER";
  permissions: PermissionList;
  roles?: { permissions: PermissionList }[];
}

/** a permission list from a user or role (an array, or a JSON array from the database) */
export function toPermissionList(value: PermissionList): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export interface HasPermissionOptions {
  /** the user to check the permissions of */
  userToCheck: PartialUser | null;
  /** the permissions you want to check. */
  permissionsToCheck: (Permissions | string)[];
}
/**
 * checks whether a user has certain permissions.
 * @returns whether a user has certain permissions.
 */
export function hasPermission(options: HasPermissionOptions) {
  let userPermissions = toPermissionList(options.userToCheck?.permissions);

  if (!options.userToCheck) return false;
  if (options.userToCheck.roles && options.userToCheck.roles.length >= 1) {
    userPermissions = [
      ...userPermissions,
      ...options.userToCheck.roles.flatMap((r) => toPermissionList(r.permissions)),
    ];
  }

  if (options.userToCheck.rank === "OWNER") {
    return true;
  }

  if (userPermissions.length <= 0 || !Array.isArray(options.permissionsToCheck)) {
    return false;
  }

  for (const perm of options.permissionsToCheck) {
    if (userPermissions.includes(perm)) return true;
  }

  return false;
}

export type PermissionNames = keyof typeof Permissions;

/**
 * given a list of permissions, return a dictionary of permissions.
 * @param user - The user where you want to get the permissions of.
 * @returns A dictionary of permissions.
 */
export function getPermissions(user: PartialUser): Record<PermissionNames, boolean> {
  const permissions: Record<string, boolean> = {};

  allPermissions.forEach((name) => {
    permissions[name] = hasPermission({
      userToCheck: user,
      permissionsToCheck: [name],
    });
  });

  return permissions;
}

export { defaultPermissions };
