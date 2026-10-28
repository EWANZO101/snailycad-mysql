import { shallow } from "zustand/shallow";
import { createWithEqualityFn } from "zustand/traditional";

interface ActiveUnitsState {
  showLeoFilters: boolean;
  showEmsFilters: boolean;
  showDotFilters: boolean;
  setShowFilters(type: "leo" | "ems-fd" | "dot", v: boolean): void;

  leoSearch: string;
  emsSearch: string;
  dotSearch: string;
  setSearch(
    type: keyof Pick<ActiveUnitsState, "emsSearch" | "leoSearch" | "dotSearch">,
    value: string,
  ): void;
}

export const useActiveUnitsState = createWithEqualityFn<ActiveUnitsState>()(
  (set) => ({
    showLeoFilters: false,
    showEmsFilters: false,
    showDotFilters: false,
    setShowFilters: (type, v) => {
      const propName =
        type === "leo" ? "showLeoFilters" : type === "dot" ? "showDotFilters" : "showEmsFilters";
      set({ [propName]: v } as unknown as ActiveUnitsState);
    },

    leoSearch: "",
    emsSearch: "",
    dotSearch: "",
    setSearch: (type, value) => set({ [type]: value } as unknown as ActiveUnitsState),
  }),
  shallow,
);
