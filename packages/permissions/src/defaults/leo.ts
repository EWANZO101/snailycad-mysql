import { Permissions } from "../permissions";

export const defaultLeoPermissions = [
  Permissions.Leo,
  Permissions.ViewIncidents,
  Permissions.ManageIncidents,
  Permissions.ViewImpoundLot,
  Permissions.ManageImpoundLot,
  Permissions.ViewJail,
  Permissions.ManageJail,
  Permissions.ViewCallHistory,
  Permissions.ManageCallHistory,
  Permissions.ViewDLExams,
  Permissions.ManageDLExams,
  Permissions.ViewWeaponExams,
  Permissions.ManageWeaponExams,
  Permissions.ViewLicenseExams,
  Permissions.ManageLicenseExams,
  Permissions.ManageDMV,
  Permissions.ManageBureauOfFirearms,
  Permissions.DeleteCitizenRecords,
  Permissions.ViewCitizenLogs,
  Permissions.ManageWarrants,
  Permissions.ManageAwardsAndQualifications,
  Permissions.LeoManageCustomFields,
  Permissions.LeoManageCitizenProfile,
  Permissions.SelfAssignToCalls,
];

/**
 * narrowly scoped LEO supervisor permissions. these are intentionally **not** part of
 * `defaultLeoPermissions` (which are granted to every new LEO user).
 */
export const defaultLeoSupervisorPermissions = [
  Permissions.ManageOfficerRank,
  Permissions.ManageOfficerCallsign,
];

export const defaultDispatchPermissions = [Permissions.Dispatch, Permissions.LiveMap];

/**
 * staff-only live map permissions. these are intentionally **not** part of
 * `defaultDispatchPermissions` (which are granted to every dispatcher): regular dispatchers
 * only see on-duty LEO/EMS-FD units on the live map, not every player's location.
 */
export const defaultLiveMapStaffPermissions = [Permissions.ViewAllPlayersOnLiveMap];

export const defaultEmsFdPermissions = [
  Permissions.EmsFd,
  Permissions.DeclareCitizenDead,
  Permissions.ViewEmsFdIncidents,
  Permissions.ManageEmsFdIncidents,
  Permissions.ViewDeadCitizens,
  Permissions.ManageDeadCitizens,
  Permissions.SelfAssignToCalls,
];

export const defaultDotPermissions = [Permissions.Dot, Permissions.SelfAssignToCalls];
