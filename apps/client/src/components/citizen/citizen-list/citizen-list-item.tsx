import { defaultPermissions } from "@snailycad/permissions";
import type { GetCitizensData } from "@snailycad/types/api";
import { buttonVariants } from "@snailycad/ui";
import { ImageWrapper } from "components/shared/image-wrapper";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";
import { useImageUrl } from "hooks/useImageUrl";
import { usePermission } from "hooks/usePermission";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ChevronRight, PersonFill } from "react-bootstrap-icons";

interface Props {
  citizen: GetCitizensData["citizens"][number];
}

export function CitizenListItem({ citizen }: Props) {
  const common = useTranslations("Common");
  const t = useTranslations("Citizen");
  const { SOCIAL_SECURITY_NUMBERS, COMMON_CITIZEN_CARDS, MODERN_CITIZEN_THEME } =
    useFeatureEnabled();
  const { makeImageUrl } = useImageUrl();
  const { hasPermissions } = usePermission();
  const hasLeoPermissions = hasPermissions(defaultPermissions.defaultLeoPermissions);

  if (!MODERN_CITIZEN_THEME) {
    return <LegacyCitizenListItem citizen={citizen} />;
  }

  return (
    <li className="group relative">
      <Link
        href={`/citizen/${citizen.id}`}
        aria-label={`${t("viewCitizen")}: ${citizen.name} ${citizen.surname}`}
        className="flex h-full items-center gap-4 rounded-xl border border-gray-300 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-400 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-quinary dark:bg-tertiary dark:hover:border-neutral-500"
      >
        {citizen.imageId ? (
          <ImageWrapper
            quality={80}
            placeholder={citizen.imageBlurData ? "blur" : "empty"}
            blurDataURL={citizen.imageBlurData ?? undefined}
            alt={`${citizen.name} ${citizen.surname}`}
            draggable={false}
            className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-gray-200 dark:ring-quinary"
            src={makeImageUrl("citizens", citizen.imageId)!}
            loading="lazy"
            width={64}
            height={64}
            fallback={<CitizenAvatarFallback />}
          />
        ) : (
          <CitizenAvatarFallback />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold capitalize">
            {citizen.name} {citizen.surname}
          </p>

          <div className="mt-1 flex flex-wrap gap-1.5">
            {SOCIAL_SECURITY_NUMBERS ? (
              <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-neutral-600 dark:bg-secondary dark:text-neutral-300">
                SSN {citizen.socialSecurityNumber}
              </span>
            ) : null}
            {COMMON_CITIZEN_CARDS && hasLeoPermissions ? (
              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-secondary dark:text-neutral-300">
                User: {citizen.user?.username ?? common("none")}
              </span>
            ) : null}
          </div>
        </div>

        <span className="hidden shrink-0 items-center gap-1 text-sm font-medium text-neutral-500 transition-colors group-hover:text-blue-600 sm:flex dark:text-neutral-400 dark:group-hover:text-blue-400">
          {t("viewCitizen")}
          <ChevronRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </Link>
    </li>
  );
}

function CitizenAvatarFallback() {
  return (
    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-100 ring-2 ring-gray-200 dark:bg-secondary dark:ring-quinary">
      <PersonFill className="h-8 w-8 text-gray-500/70" aria-hidden />
    </span>
  );
}

function LegacyCitizenListItem({ citizen }: Props) {
  const common = useTranslations("Common");
  const t = useTranslations("Citizen");
  const { SOCIAL_SECURITY_NUMBERS, COMMON_CITIZEN_CARDS } = useFeatureEnabled();
  const { makeImageUrl } = useImageUrl();
  const { hasPermissions } = usePermission();
  const hasLeoPermissions = hasPermissions(defaultPermissions.defaultLeoPermissions);

  return (
    <li className="flex items-center justify-between bg-gray-200 p-3 dark:shadow-md rounded-md border border-gray-400 dark:border-quinary dark:bg-tertiary">
      <div className="flex items-center space-x-3">
        {citizen.imageId ? (
          <ImageWrapper
            quality={80}
            placeholder={citizen.imageBlurData ? "blur" : "empty"}
            blurDataURL={citizen.imageBlurData ?? undefined}
            alt={`${citizen.name} ${citizen.surname}`}
            draggable={false}
            className="object-cover rounded-md w-14 h-14"
            src={makeImageUrl("citizens", citizen.imageId)!}
            loading="lazy"
            width={56}
            height={56}
            fallback={<PersonFill className="w-12 h-12 text-gray-500/60" />}
          />
        ) : (
          <PersonFill className="w-12 h-12 text-gray-500/60" />
        )}

        <div className="flex flex-col">
          <p className="text-xl font-semibold capitalize">
            {citizen.name} {citizen.surname}
          </p>

          {SOCIAL_SECURITY_NUMBERS ? (
            <p className="text-neutral-600 dark:text-neutral-300">
              <strong>SSN:</strong> {citizen.socialSecurityNumber}
            </p>
          ) : null}
          {COMMON_CITIZEN_CARDS && hasLeoPermissions ? (
            <p className="text-neutral-600 dark:text-neutral-300">
              <strong>User:</strong> {citizen.user?.username ?? common("none")}
            </p>
          ) : null}
        </div>
      </div>

      <Link
        href={`/citizen/${citizen.id}`}
        className={buttonVariants({
          className: "rounded-md transition-all p-1 px-3",
        })}
      >
        {t("viewCitizen")}
      </Link>
    </li>
  );
}
