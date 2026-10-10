import { Controller } from "@tsed/di";
import { ContentType, Description, Get } from "@tsed/schema";
import { getDemoStatus } from "lib/demo/demo-mode";

@Controller("/demo")
@ContentType("application/json")
export class DemoController {
  @Get("/")
  @Description("Get the demo mode status, including the demo login details when it's enabled")
  async getDemoStatus() {
    return getDemoStatus();
  }
}
