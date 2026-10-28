import { Context, Middleware, Req, type MiddlewareMethods, Res, Next } from "@tsed/common";
import { getSessionUser } from "lib/auth/getSessionUser";
import { getActiveDotWorker } from "lib/get-active-dot-worker";

@Middleware()
export class ActiveDotWorker implements MiddlewareMethods {
  async use(@Req() req: Req, @Res() res: Res, @Context() ctx: Context, @Next() next: Next) {
    const user = await getSessionUser({ req, res });
    const worker = await getActiveDotWorker({ req, user, ctx });

    ctx.set("activeDotWorker", worker);

    next();
  }
}
