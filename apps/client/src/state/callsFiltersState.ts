import type {
  CallSource,
  Record,
  Citizen,
  MedicalRecord,
  RegisteredVehicle,
  Weapon,
} from "@snailycad/types";
import { shallow } from "zustand/shallow";
import { createWithEqualityFn } from "zustand/traditional";

export type CitizenWithVehAndWep = Citizen & {
  weapons: Weapon[];
  vehicles: RegisteredVehicle[];
  medicalRecords: MedicalRecord[];
  Record: Record[];
};

interface CallFiltersState {
  showFilters: boolean;
  setShowFilters(showFilters: boolean): void;

  search: string;
  setSearch(search: string): void;

  department: string | null;
  setDepartment(department: string | null): void;

  division: string | null;
  setDivision(division: string | null): void;

  assignedUnit: string | null;
  setAssignedUnit(assignedUnit: string | null): void;

  /** which integration's calls to show - null means "all sources" */
  source: CallSource | null;
  setSource(source: CallSource | null): void;
}

export const useCallsFilters = createWithEqualityFn<CallFiltersState>()(
  (set) => ({
    showFilters: false,
    setShowFilters: (showFilters) => set({ showFilters }),

    search: "",
    setSearch: (search) => set({ search }),

    assignedUnit: null,
    setAssignedUnit: (assignedUnit) => set({ assignedUnit }),

    department: null,
    setDepartment: (department) => set({ department }),

    division: null,
    setDivision: (division) => set({ division }),

    source: null,
    setSource: (source) => set({ source }),
  }),
  shallow,
);
