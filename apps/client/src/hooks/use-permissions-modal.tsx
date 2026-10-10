import { defaultPermissions, Permissions } from "@snailycad/permissions";
import { useTranslations } from "use-intl";

const DEPRECATED_PERMISSIONS = [
  Permissions.ViewDLExams,
  Permissions.ManageDLExams,
  Permissions.ViewWeaponExams,
  Permissions.ManageWeaponExams,
];

const filteredAdminPermissions = defaultPermissions.allDefaultAdminPermissions.filter(
  (p) => !defaultPermissions.defaultCourthousePermissions.includes(p),
);

interface UsePermissionsModalOptions {
  isReadOnly?: boolean;
  /**
   * whether the authenticated user is allowed to toggle this permission.
   * users can only grant/remove permissions they have themselves.
   */
  canManagePermission?(permission: Permissions): boolean;
}

export function usePermissionsModal(options: UsePermissionsModalOptions) {
  const t = useTranslations("Permissions");

  const groups = [
    {
      name: t("admin"),
      permissions: filteredAdminPermissions,
    },
    {
      name: t("courthouseAdmin"),
      permissions: defaultPermissions.defaultCourthousePermissions,
    },
    {
      name: t("leo"),
      permissions: [
        ...defaultPermissions.defaultLeoPermissions,
        Permissions.SetUserDefinedCallsignOnOfficer,
        Permissions.PurgeLeoIncidents,
      ],
    },
    {
      name: t("leoSupervisor"),
      permissions: defaultPermissions.defaultLeoSupervisorPermissions,
    },
    {
      name: t("dispatch"),
      permissions: [
        ...defaultPermissions.defaultDispatchPermissions,
        ...defaultPermissions.defaultLiveMapStaffPermissions,
        Permissions.ManageSmartSigns,
        Permissions.ManageSmartMotorwaySigns,
      ],
    },
    {
      name: t("emsFd"),
      permissions: [
        ...defaultPermissions.defaultEmsFdPermissions,
        Permissions.SetUserDefinedCallsignOnEmsFd,
        Permissions.PurgeEmsFdIncidents,
      ],
    },
    {
      name: t("citizenRelated"),
      permissions: [
        ...defaultPermissions.defaultTowPermissions,
        ...defaultPermissions.defaultTaxiPermissions,
      ],
    },
    {
      name: t("owner"),
      permissions: [
        Permissions.ManageCADSettings,
        Permissions.DeleteRegisteredVehicles,
        Permissions.DeleteRegisteredWeapons,
      ],
    },
  ];

  function handleToggleAll(
    group: (typeof groups)[number],
    values: Record<Permissions, boolean>,
    setValues: any,
  ) {
    if (options.isReadOnly) return;

    const canManagePermission = (permission: Permissions) =>
      options.canManagePermission?.(permission) ?? true;

    // only toggle the permissions the authenticated user is allowed to manage
    const groupPermissionValues = Object.entries(values).filter(([permission]) => {
      return (
        group.permissions.includes(permission as Permissions) &&
        canManagePermission(permission as Permissions)
      );
    });
    const areAllChecked = groupPermissionValues.every(([, b]) => b);

    if (areAllChecked) {
      const obj = groupPermissionValues.reduce(
        (ac, [permission]) => ({ ...ac, [permission]: false }),
        {},
      );

      setValues({ ...values, ...obj });
    } else {
      const obj = group.permissions.filter(canManagePermission).reduce(
        (ac, cv) => ({
          ...ac,
          [cv]: true,
        }),
        {},
      );

      setValues({ ...values, ...obj });
    }
  }

  return { handleToggleAll, groups, DEPRECATED_PERMISSIONS };
}
