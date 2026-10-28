import { Controller } from "@tsed/di";
import { Context, UseBeforeEach } from "@tsed/common";
import { ContentType, Description, Get, Post, Tags } from "@tsed/schema";
import { Forbidden } from "@tsed/exceptions";
import { Rank, type User } from "@prisma/client";
import { IsAuth } from "middlewares/auth/is-auth";
import {
  acknowledgeRecoveryToken,
  getRecoveryTokenPaths,
  getUnacknowledgedRecoveryToken,
  readRecoveryTokenState,
  rotateRecoveryToken,
} from "lib/recovery/recovery-token";

function assertOwner(user: Pick<User, "rank" | "id">) {
  if (user.rank !== Rank.OWNER) {
    throw new Forbidden("Invalid Permissions");
  }
}

@Tags("Admin")
@Controller("/admin/recovery-token")
@UseBeforeEach(IsAuth)
@ContentType("application/json")
export class AdminRecoveryTokenController {
  @Get("/")
  @Description(
    "Owner only. Returns the recovery token file path, and the token itself only while it has not been acknowledged yet.",
  )
  async getRecoveryToken(@Context("user") user: User) {
    assertOwner(user);

    const state = readRecoveryTokenState();
    const { tokenPath } = getRecoveryTokenPaths();

    return {
      tokenAcknowledged: state.tokenAcknowledged,
      createdAt: state.createdAt || null,
      path: tokenPath,
      token: state.tokenAcknowledged ? null : getUnacknowledgedRecoveryToken(),
    };
  }

  @Post("/acknowledge")
  @Description("Owner only. Marks the recovery token as saved; it will no longer be shown.")
  async acknowledge(@Context("user") user: User) {
    assertOwner(user);
    acknowledgeRecoveryToken();
    console.info(`[recovery] Recovery token acknowledged by user ${user.id}.`);

    return true;
  }

  @Post("/rotate")
  @Description("Owner only. Generates a new recovery token and returns it once.")
  async rotate(@Context("user") user: User) {
    assertOwner(user);
    const token = rotateRecoveryToken();
    const { tokenPath } = getRecoveryTokenPaths();
    console.info(`[recovery] Recovery token rotated by user ${user.id}.`);

    return { token, path: tokenPath, tokenAcknowledged: false, createdAt: new Date().toISOString() };
  }
}
