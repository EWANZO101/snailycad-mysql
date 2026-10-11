import { toPermissionList } from "@snailycad/permissions";
import { type Prisma } from "@prisma/client";
import { type AllowedFileExtension, allowedFileExtensions } from "@snailycad/config";
import { CUSTOM_ROLE_SCHEMA } from "@snailycad/schemas";
import {
  BodyParams,
  Context,
  MultipartFile,
  PathParams,
  type PlatformMulterFile,
  QueryParams,
  UseBeforeEach,
} from "@tsed/common";
import { Controller } from "@tsed/di";
import { NotFound } from "@tsed/exceptions";
import { ContentType, Delete, Description, Get, Post, Put } from "@tsed/schema";
import { prisma } from "lib/data/prisma";
import { validateSchema } from "lib/data/validate-schema";
import { IsAuth } from "middlewares/auth/is-auth";
import { UsePermissions, Permissions } from "middlewares/use-permissions";
import { ExtendedBadRequest } from "~/exceptions/extended-bad-request";
import { validateImageURL } from "lib/images/validate-image-url";
import fs from "node:fs/promises";
import process from "node:process";
import type * as APITypes from "@snailycad/types/api";
import { AuditLogActionType, createAuditLogEntry } from "@snailycad/audit-logger/server";
import { defaultPermissions } from "@snailycad/permissions";
import { User } from "@snailycad/types";
import {
  assertActorHoldsPermissions,
  assertCanChangePermissions,
} from "lib/auth/permission-escalation";

@Controller("/admin/manage/custom-roles")
@UseBeforeEach(IsAuth)
@ContentType("application/json")
export class AdminManageCustomRolesController {
  @UsePermissions({ permissions: defaultPermissions.allDefaultAdminPermissions })
  @Get("/")
  @Description("Get all custom roles (paginated)")
  async getCustomRoles(
    @QueryParams("skip", Number) skip = 0,
    @QueryParams("includeAll", Boolean) includeAll = false,
    @QueryParams("query", String) query = "",
  ): Promise<APITypes.GetCustomRolesData> {
    const where = query
      ? ({
          OR: [{ name: { contains: query } }, { discordRole: { name: { contains: query } } }],
        } satisfies Prisma.CustomRoleWhereInput)
      : undefined;

    const [totalCount, customRoles] = await prisma.$transaction([
      prisma.customRole.count({ where }),
      prisma.customRole.findMany({
        include: { discordRole: true },
        take: includeAll ? undefined : 35,
        skip: includeAll ? undefined : skip,
        where,
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    return { customRoles, totalCount };
  }

  @Post("/")
  @UsePermissions({
    permissions: [Permissions.ManageCustomRoles],
  })
  @Description("Create a new custom role.")
  async createCustomRole(
    @BodyParams() body: unknown,
    @Context("sessionUserId") sessionUserId: string,
    @Context("user") sessionUser: User,
  ): Promise<APITypes.PostCustomRolesData> {
    const data = validateSchema(CUSTOM_ROLE_SCHEMA, body);

    // a user cannot create a custom role with permissions they do not have themselves.
    assertActorHoldsPermissions(sessionUser, data.permissions as string[]);

    const existing = await prisma.customRole.findFirst({
      where: { name: { equals: data.name } },
    });

    if (existing) {
      throw new ExtendedBadRequest({ name: "A custom role already exists with this name." });
    }

    const customRole = await prisma.customRole.create({
      data: {
        name: data.name,
        permissions: data.permissions,
        iconId: validateImageURL(data.icon),
        discordRoleId: data.discordRoleId,
      },
      include: { discordRole: true },
    });

    await createAuditLogEntry({
      action: { type: AuditLogActionType.CustomRoleCreate, new: customRole },
      prisma,
      executorId: sessionUserId,
    });

    return customRole;
  }

  @Put("/:id")
  @UsePermissions({
    permissions: [Permissions.ManageCustomRoles],
  })
  @Description("Update a custom role by its ID.")
  async updateCustomRole(
    @BodyParams() body: unknown,
    @PathParams("id") id: string,
    @Context("sessionUserId") sessionUserId: string,
    @Context("user") sessionUser: User,
  ): Promise<APITypes.PutCustomRoleByIdData> {
    const data = validateSchema(CUSTOM_ROLE_SCHEMA, body);

    const customRole = await prisma.customRole.findUnique({
      where: { id },
      include: { discordRole: true },
    });

    if (!customRole) {
      throw new NotFound("customRoleNotFound");
    }

    // a user can only add/remove permissions to/from a custom role that they have themselves.
    assertCanChangePermissions({
      actor: sessionUser,
      previous: toPermissionList(customRole.permissions),
      next: data.permissions as string[],
    });

    /**
     * changing the linked Discord role changes who receives this role (and its permissions),
     * so the user must hold every permission of this role.
     */
    if ((data.discordRoleId ?? null) !== (customRole.discordRoleId ?? null)) {
      assertActorHoldsPermissions(sessionUser, [
        ...toPermissionList(customRole.permissions),
        ...(data.permissions as string[]),
      ]);
    }

    const updated = await prisma.customRole.update({
      where: { id: customRole.id },
      data: {
        name: data.name,
        permissions: data.permissions,
        iconId: validateImageURL(data.icon),
        discordRoleId: data.discordRoleId,
      },
      include: { discordRole: true },
    });

    await createAuditLogEntry({
      action: { type: AuditLogActionType.CustomRoleUpdate, previous: customRole, new: updated },
      prisma,
      executorId: sessionUserId,
    });

    return updated;
  }

  @Delete("/:id")
  @UsePermissions({
    permissions: [Permissions.ManageCustomRoles],
  })
  @Description("Delete a custom role by its ID.")
  async deleteCustomRole(
    @PathParams("id") id: string,
    @Context("sessionUserId") sessionUserId: string,
    @Context("user") sessionUser: User,
  ): Promise<APITypes.DeleteCustomRoleByIdData> {
    const customRole = await prisma.customRole.findUnique({
      where: { id },
    });

    if (!customRole) {
      throw new NotFound("customRoleNotFound");
    }

    // deleting a role removes its permissions from every user that has it.
    assertActorHoldsPermissions(sessionUser, toPermissionList(customRole.permissions));

    await prisma.customRole.delete({
      where: { id: customRole.id },
    });

    await createAuditLogEntry({
      action: { type: AuditLogActionType.CustomRoleDelete, new: customRole },
      prisma,
      executorId: sessionUserId,
    });

    return true;
  }

  @Post("/:id")
  @UsePermissions({
    permissions: [Permissions.ManageCustomRoles],
  })
  @Description("Upload an image to a custom role.")
  async uploadImageToCustomRole(
    @PathParams("id") customRoleId: string,
    @Context("sessionUserId") sessionUserId: string,
    @MultipartFile("image") file?: PlatformMulterFile,
  ): Promise<APITypes.PostCustomRoleByIdData> {
    const customRole = await prisma.customRole.findUnique({
      where: {
        id: customRoleId,
      },
    });

    if (!customRole) {
      throw new NotFound("customRoleNotFound");
    }

    if (!file) {
      throw new ExtendedBadRequest({ file: "No file provided." });
    }

    if (!allowedFileExtensions.includes(file.mimetype as AllowedFileExtension)) {
      throw new ExtendedBadRequest({ image: "invalidImageType" });
    }

    // "image/png" -> "png"
    const extension = file.mimetype.split("/")[file.mimetype.split("/").length - 1];
    const path = `${process.cwd()}/public/values/${customRole.id}.${extension}`;

    const [data] = await Promise.all([
      prisma.customRole.update({
        where: { id: customRole.id },
        data: { iconId: `${customRole.id}.${extension}` },
      }),
      fs.writeFile(path, file.buffer),
    ]);

    await createAuditLogEntry({
      action: { type: AuditLogActionType.CustomRoleUpdate, previous: customRole, new: data },
      prisma,
      executorId: sessionUserId,
    });

    return data;
  }
}
