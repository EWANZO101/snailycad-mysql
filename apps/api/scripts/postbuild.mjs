import { cp } from "node:fs/promises";
import { resolve } from "node:path";

const currentDir = process.cwd();
const templatesDir = resolve(currentDir, "src/templates");
const swaggerThemeDir = resolve(currentDir, "src/swagger-theme");

// Neither directory is copied over by SWC (it only compiles .ts/.js). Therefore, we have to do this manually.
cp(templatesDir, resolve(currentDir, "dist/templates"), { recursive: true });
cp(swaggerThemeDir, resolve(currentDir, "dist/swagger-theme"), { recursive: true });
