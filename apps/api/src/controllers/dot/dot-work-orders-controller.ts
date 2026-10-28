import { Controller, UseBeforeEach } from "@tsed/common";
import { ContentType, Delete, Description, Get, Post, Put, Tags } from "@tsed/schema";
import { BodyParams, Context, PathParams, QueryParams } from "@tsed/platform-params";
import { NotFound } from "@tsed/exceptions";
import { Feature, type User } from "@prisma/client";
import { CREATE_DOT_WORK_ORDER_SCHEMA, UPDATE_DOT_WORK_ORDER_SCHEMA } from "@snailycad/schemas";
import { prisma } from "lib/data/prisma";
import { validateSchema } from "lib/data/validate-schema";
import { IsAuth } from "middlewares/auth/is-auth";
import { IsFeatureEnabled } from "middlewares/is-enabled";
import { UsePermissions, Permissions } from "middlewares/use-permissions";
import { dotWorkerProperties } from "utils/leo/includes";
import type * as APITypes from "@snailycad/types/api";

const workOrderInclude = {
  department: { include: { value: true } },
  assignedWorker: { include: dotWorkerProperties },
} as const;

const WORK_ORDER_PERMISSIONS = [Permissions.Dot, Permissions.Dispatch, Permissions.ManageUnits];

@Tags("DOT")
@Controller("/dot/work-orders")
@UseBeforeEach(IsAuth)
@ContentType("application/json")
@IsFeatureEnabled({ feature: Feature.DOT })
export class DotWorkOrdersController {
  @Get("/")
  @Description("Get the DOT work-order board")
  @UsePermissions({ permissions: WORK_ORDER_PERMISSIONS })
  async getWorkOrders(
    @QueryParams("status") status?: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
  ): Promise<APITypes.GetDotWorkOrdersData> {
    return prisma.dotWorkOrder.findMany({
      where: status ? { status } : { status: { not: "CANCELLED" } },
      include: workOrderInclude,
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: 200,
    });
  }

  @Post("/")
  @Description("Log a new DOT work order")
  @UsePermissions({ permissions: WORK_ORDER_PERMISSIONS })
  async createWorkOrder(
    @BodyParams() body: unknown,
    @Context("user") user: User,
  ): Promise<APITypes.PostDotWorkOrdersData> {
    const data = validateSchema(CREATE_DOT_WORK_ORDER_SCHEMA, body);

    return prisma.dotWorkOrder.create({
      data: {
        title: data.title,
        description: data.description || null,
        location: data.location,
        postal: data.postal || null,
        priority: data.priority,
        departmentId: data.departmentId || null,
        createdByUserId: user.id,
      },
      include: workOrderInclude,
    });
  }

  @Put("/:id")
  @Description("Update a DOT work order: status, assignee or details")
  @UsePermissions({ permissions: WORK_ORDER_PERMISSIONS })
  async updateWorkOrder(
    @PathParams("id") id: string,
    @BodyParams() body: unknown,
  ): Promise<APITypes.PutDotWorkOrderByIdData> {
    const workOrder = await prisma.dotWorkOrder.findUnique({ where: { id } });
    if (!workOrder) throw new NotFound("workOrderNotFound");

    const data = validateSchema(UPDATE_DOT_WORK_ORDER_SCHEMA, body);
    const movingToCompleted = data.status === "COMPLETED" && workOrder.status !== "COMPLETED";
    const movingAwayFromCompleted =
      data.status && data.status !== "COMPLETED" && workOrder.status === "COMPLETED";

    return prisma.dotWorkOrder.update({
      where: { id },
      data: {
        ...(data.title ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.location ? { location: data.location } : {}),
        ...(data.postal !== undefined ? { postal: data.postal || null } : {}),
        ...(data.priority ? { priority: data.priority } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.departmentId !== undefined ? { departmentId: data.departmentId || null } : {}),
        ...(data.assignedWorkerId !== undefined
          ? { assignedWorkerId: data.assignedWorkerId || null }
          : {}),
        ...(movingToCompleted ? { completedAt: new Date() } : {}),
        ...(movingAwayFromCompleted ? { completedAt: null } : {}),
      },
      include: workOrderInclude,
    });
  }

  @Delete("/:id")
  @Description("Delete a DOT work order")
  @UsePermissions({ permissions: WORK_ORDER_PERMISSIONS })
  async deleteWorkOrder(
    @PathParams("id") id: string,
  ): Promise<APITypes.DeleteDotWorkOrderByIdData> {
    const workOrder = await prisma.dotWorkOrder.findUnique({ where: { id } });
    if (!workOrder) throw new NotFound("workOrderNotFound");

    await prisma.dotWorkOrder.delete({ where: { id } });
    return true;
  }
}
