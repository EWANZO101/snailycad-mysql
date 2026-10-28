import type * as Types from "../index.js";

/**
 * @method GET
 * @route /dot
 */
export interface GetMyDotWorkersData {
  workers: (Types.DotWorker & {
    qualifications: Types.UnitQualification[];
  })[];
}

/**
 * @method POST
 * @route /dot
 */
export type PostMyDotWorkersData = GetMyDotWorkersData["workers"][number];

/**
 * @method PUT
 * @route /dot/:id
 */
export type PutMyDotWorkerByIdData = GetMyDotWorkersData["workers"][number];

/**
 * @method DELETE
 * @route /dot/:id
 */
export type DeleteMyDotWorkerByIdData = boolean;

/**
 * @method GET
 * @route /dot/logs
 */
export interface GetMyDotWorkersLogsData {
  logs: (Types.OfficerLog & {
    dotWorker: Types.DotWorker | null;
  })[];
  totalCount: number;
}

/**
 * @method POST
 * @route /dot/image/:id
 */
export interface PostMyDotWorkerByIdData {
  imageId: string | null;
}

/**
 * @method PUT
 * @route /dot/status/:id
 */
export type PutDotWorkerStatusByIdData = Types.DotWorker;

/**
 * @method GET
 * @route /dot/active-dot-worker
 */
export type GetDotActiveWorker = Types.DotWorker;

/**
 * @method GET
 * @route /dot/active-dot-workers
 */
export type GetDotActiveWorkers = (Types.DotWorker | Types.CombinedDotUnit)[];

/**
 * @method GET
 * @route /dot/work-orders
 */
export type GetDotWorkOrdersData = Types.DotWorkOrder[];

/**
 * @method POST
 * @route /dot/work-orders
 */
export type PostDotWorkOrdersData = Types.DotWorkOrder;

/**
 * @method PUT
 * @route /dot/work-orders/:id
 */
export type PutDotWorkOrderByIdData = Types.DotWorkOrder;

/**
 * @method DELETE
 * @route /dot/work-orders/:id
 */
export type DeleteDotWorkOrderByIdData = boolean;
