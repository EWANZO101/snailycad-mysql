import { useTranslations } from "use-intl";
import type { cad, MiscCadSettings } from "@snailycad/types";

interface Props {
  cad: (Partial<cad> & { miscCadSettings?: Partial<MiscCadSettings> | null }) | null;
}

/**
 * Under the login / register form: who to ask for help (the community's staff, not SnailyCAD).
 * Admins change the text in CAD Settings > General > Login page notice.
 */
export function AuthScreenNotice({ cad }: Props) {
  const t = useTranslations("Auth");
  const custom = cad?.miscCadSettings?.loginNotice?.trim();

  return (
    <div className="mt-4 md:mt-0 md:absolute md:bottom-8 md:left-1/2 md:-translate-x-1/2 w-full max-w-md px-4 text-center text-sm text-neutral-600 dark:text-gray-400 z-40">
      <p className="whitespace-pre-line">{custom || t("loginNotice")}</p>
      <a
        rel="noreferrer"
        target="_blank"
        className="mt-1 inline-block text-xs underline text-neutral-500 hover:text-neutral-800 dark:text-gray-500 dark:hover:text-gray-300"
        href="https://snailycad.org"
      >
        {t("madeWithSnailyCAD")}
      </a>
    </div>
  );
}
