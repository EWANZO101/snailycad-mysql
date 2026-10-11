import { prisma } from "lib/data/prisma";
import { setCADFeatures } from "middlewares/auth/is-auth";

/** the CAD with its features (as a Record) and misc settings, like the auth middleware sets it */
export async function getCadWithFeatures() {
  const raw = await prisma.cad.findFirst({ include: { features: true, miscCadSettings: true } });
  if (!raw) return null;
  const cad = setCADFeatures(raw);
  if (!cad.miscCadSettings) return null;
  return { ...cad, miscCadSettings: cad.miscCadSettings };
}

export type CadWithFeatures = NonNullable<Awaited<ReturnType<typeof getCadWithFeatures>>>;
