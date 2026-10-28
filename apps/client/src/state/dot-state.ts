import type { CombinedDotUnit, DotWorker } from "@snailycad/types";
import { shallow } from "zustand/shallow";
import { createWithEqualityFn } from "zustand/traditional";

export type ActiveDotWorker = DotWorker | CombinedDotUnit;

interface DotState {
  activeWorker: ActiveDotWorker | null;
  setActiveWorker(worker: ActiveDotWorker | null): void;

  workers: DotWorker[];
  setWorkers(workers: DotWorker[]): void;
}

export const useDotState = createWithEqualityFn<DotState>()(
  (set) => ({
    activeWorker: null,
    setActiveWorker: (worker) => set({ activeWorker: worker }),

    workers: [],
    setWorkers: (workers) => set({ workers }),
  }),
  shallow,
);
