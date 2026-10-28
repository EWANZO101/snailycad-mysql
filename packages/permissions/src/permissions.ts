export enum Permissions {
  // leo related
  Leo = "Leo",
  ViewIncidents = "ViewIncidents",
  ManageIncidents = "ManageIncidents",
  ViewImpoundLot = "ViewImpoundLot",
  ManageImpoundLot = "ManageImpoundLot",
  ViewJail = "ViewJail",
  ManageJail = "ManageJail",
  ViewCallHistory = "ViewCallHistory",
  ManageCallHistory = "ManageCallHistory",
  LiveMap = "LiveMap",
  ViewCitizenLogs = "ViewCitizenLogs",
  ViewLicenseExams = "ViewLicenseExams",
  ManageLicenseExams = "ManageLicenseExams",
  SetUserDefinedCallsignOnOfficer = "SetUserDefinedCallsignOnOfficer",
  SelfAssignToCalls = "SelfAssignToCalls",
  // leo supervisor: scoped officer management
  ManageOfficerRank = "ManageOfficerRank",
  ManageOfficerCallsign = "ManageOfficerCallsign",

  ViewCustomFields = "ViewCustomFields",
  ManageCustomFields = "ManageCustomFields",
  ManageDMV = "ManageDMV",
  ManageBureauOfFirearms = "ManageBureauOfFirearms",
  DeleteCitizenRecords = "DeleteCitizenRecords",
  ManageCustomRoles = "ManageCustomRoles",
  ViewCustomRoles = "ViewCustomRoles",
  ManageWarrants = "ManageWarrants",
  ManageAwardsAndQualifications = "ManageAwardsAndQualifications",
  PurgeLeoIncidents = "PurgeLeoIncidents",
  LeoManageCustomFields = "LeoManageCustomFields",
  LeoManageCitizenProfile = "LeoManageCitizenProfile",

  Dispatch = "Dispatch",
  /**
   * staff-only: see every connected player on the live map. Without this permission, the live map
   * only shows players that are linked to an on-duty LEO or EMS/FD unit.
   */
  ViewAllPlayersOnLiveMap = "ViewAllPlayersOnLiveMap",
  ManageSmartSigns = "ManageSmartSigns",
  ManageSmartMotorwaySigns = "ManageSmartMotorwaySigns",

  // ems-fd
  EmsFd = "EmsFd",
  ViewEmsFdIncidents = "ViewEmsFdIncidents",
  ManageEmsFdIncidents = "ManageEmsFdIncidents",
  DeclareCitizenDead = "DeclareCitizenDead",
  PurgeEmsFdIncidents = "PurgeEmsFdIncidents",
  ViewDeadCitizens = "ViewDeadCitizens",
  ManageDeadCitizens = "ManageDeadCitizens",
  SetUserDefinedCallsignOnEmsFd = "SetUserDefinedCallsignOnEmsFd",

  //  citizen related
  ViewTaxiCalls = "ViewTaxiCalls",
  ManageTaxiCalls = "ManageTaxiCalls",

  ViewTowCalls = "ViewTowCalls",
  ManageTowCalls = "ManageTowCalls",
  ViewTowLogs = "ViewTowLogs",

  CreateBusinesses = "CreateBusinesses",

  // admin related
  ManageCADSettings = "ManageCADSettings",

  ViewUsers = "ViewUsers",
  ManageUsers = "ManageUsers",
  BanUsers = "BanUsers",
  DeleteUsers = "DeleteUsers",
  /** only allows accepting/declining pending users */
  ManagePendingUsers = "ManagePendingUsers",

  ViewCitizens = "ViewCitizens",
  ManageCitizens = "ManageCitizens",
  DeleteCitizens = "DeleteCitizens",
  /** accept/decline requests from users to claim an unowned citizen */
  ManageCitizenClaims = "ManageCitizenClaims",

  ViewUnits = "ViewUnits",
  ManageUnits = "ManageUnits",
  DeleteUnits = "DeleteUnits",
  ManageUnitCallsigns = "ManageUnitCallsigns",
  ManageUnitRank = "ManageUnitRank",

  ViewBusinesses = "ViewBusinesses",
  ManageBusinesses = "ManageBusinesses",
  DeleteBusinesses = "DeleteBusinesses",

  ViewExpungementRequests = "ViewExpungementRequests",
  ManageExpungementRequests = "ManageExpungementRequests",

  ViewNameChangeRequests = "ViewNameChangeRequests",
  ManageNameChangeRequests = "ManageNameChangeRequests",

  ManagePendingWarrants = "ManagePendingWarrants",

  ManageCourthousePosts = "ManageCourthousePosts",

  ImportCitizens = "ImportCitizens",
  ImportRegisteredVehicles = "ImportRegisteredVehicles",
  ImportRegisteredWeapons = "ImportRegisteredWeapons",
  DeleteRegisteredVehicles = "DeleteRegisteredVehicles",
  DeleteRegisteredWeapons = "DeleteRegisteredWeapons",

  // values
  ManageValueLicense = "ManageValueLicense",
  ManageValueGender = "ManageValueGender",
  ManageValueEthnicity = "ManageValueEthnicity",
  ManageValueVehicle = "ManageValueVehicle",
  ManageValueWeapon = "ManageValueWeapon",
  ManageValueBloodGroup = "ManageValueBloodGroup",
  ManageValueBusinessRole = "ManageValueBusinessRole",
  ManageValueCodes10 = "ManageValueCodes10",
  ManageValuePenalCode = "ManageValuePenalCode",
  ManageValueDepartment = "ManageValueDepartment",
  ManageValueOfficerRank = "ManageValueOfficerRank",
  ManageValueDivision = "ManageValueDivision",
  ManageValueDLCategory = "ManageValueDLCategory",
  ManageValueImpoundLot = "ManageValueImpoundLot",
  ManageValueVehicleFlag = "ManageValueVehicleFlag",
  ManageValueCitizenFlag = "ManageValueCitizenFlag",
  ManageValueQualification = "ManageValueQualification",
  ManageValueCallType = "ManageValueCallType",
  ManageValueAddress = "ManageValueAddress",
  ManageValueEmergencyVehicle = "ManageValueEmergencyVehicle",
  ManageValueAddressFlag = "ManageValueAddressFlag",
  ManageValueVehicleTrimLevel = "ManageValueVehicleTrimLevel",
  ManageValueWeaponFlag = "ManageValueWeaponFlag",

  // deprecated
  ViewDLExams = "ViewDLExams",
  ManageDLExams = "ManageDLExams",
  ViewWeaponExams = "ViewWeaponExams",
  ManageWeaponExams = "ManageWeaponExams",
}

export const allPermissions = Object.keys(Permissions);
