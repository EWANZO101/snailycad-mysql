import { z } from "zod";
import { CREATE_OFFICER_SCHEMA } from "./leo";

export const SELECT_DOT_WORKER_SCHEMA = z.object({
  dotWorkerId: z.string().min(2),
  vehicleId: z.string().nullish(),
  userDefinedCallsign: z.string().max(255).nullish(),
});

export const DOT_WORKER_SCHEMA = CREATE_OFFICER_SCHEMA.omit({
  divisions: true,
}).extend({
  division: z.string().max(255).optional(),
});

export const CREATE_TEMPORARY_DOT_WORKER_SCHEMA = DOT_WORKER_SCHEMA.omit({
  citizenId: true,
  image: true,
  rank: true,
}).extend({
  name: z.string().min(2).max(255),
  surname: z.string().min(2).max(255),
  identifiers: z.array(z.string()).nullish(),
});

export const DOT_WORK_ORDER_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const DOT_WORK_ORDER_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export const CREATE_DOT_WORK_ORDER_SCHEMA = z.object({
  title: z.string().min(2).max(255),
  description: z.string().max(5000).nullish(),
  location: z.string().min(2).max(255),
  postal: z.string().max(255).nullish(),
  priority: z.enum(DOT_WORK_ORDER_PRIORITIES).default("MEDIUM"),
  departmentId: z.string().nullish(),
});

export const UPDATE_DOT_WORK_ORDER_SCHEMA = CREATE_DOT_WORK_ORDER_SCHEMA.partial().extend({
  status: z.enum(DOT_WORK_ORDER_STATUSES).optional(),
  assignedWorkerId: z.string().nullish(),
});
