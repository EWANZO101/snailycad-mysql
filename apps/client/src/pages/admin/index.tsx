import * as React from "react";
import { AdminLayout } from "components/admin/AdminLayout";
import { getSessionUser } from "lib/auth";
import { getTranslations } from "lib/getTranslation";
import { requestAll } from "lib/utils";
import type { GetServerSideProps } from "next";
import prettyBytes from "pretty-bytes";
import { useTranslations } from "next-intl";
import { Title } from "components/shared/Title";
import { defaultPermissions } from "@snailycad/permissions";
import type { GetAdminDashboardData } from "@snailycad/types/api";
import { Alert, Button, Loader } from "@snailycad/ui";
import { Fira_Mono } from "next/font/google";
import { classNames } from "lib/classNames";
import { RecoveryTokenCard } from "components/admin/recovery-token-card";
import { UpdateCadCard } from "components/admin/update-cad-card";
import Link from "next/link";
import useFetch from "lib/useFetch";
import { useQuery } from "@tanstack/react-query";
import { usePermission } from "hooks/usePermission";
import { Permissions } from "@snailycad/permissions";
import {
  ArrowClockwise,
  ArrowRightShort,
  CarFrontFill,
  DatabaseGear,
  Gear,
  HeartPulseFill,
  Images,
  JournalText,
  People,
  PersonBadge,
  PersonVcard,
  ShieldFill,
} from "react-bootstrap-icons";
import { SetupWizardCard } from "components/admin/setup-wizard/setup-wizard-card";
import { SetupWizardModal } from "components/admin/setup-wizard/setup-wizard-modal";

const firaMonoFont = Fira_Mono({
  weight: ["500", "700"],
  variable: "--fira-mono",
  subsets: ["latin"],
});

interface Props {
  counts: GetAdminDashboardData | null;
}

const STATS_RETRY_DELAYS_MS = [800, 2500, 6000];

export default function Admin({ counts: initialCounts }: Props) {
  const t = useTranslations("Management");
  const { execute } = useFetch();
  const [counts, setCounts] = React.useState(initialCounts);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const retryCountRef = React.useRef(0);

  const fetchStats = React.useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setIsRetrying(true);

      const { json } = await execute<GetAdminDashboardData>({
        path: "/admin",
        noToast: options?.silent,
      });

      setIsRetrying(false);

      if (json && typeof json === "object" && "activeUsers" in json) {
        setCounts(json);
        return true;
      }

      return false;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // the admin dashboard's stats can transiently fail to load server-side (e.g. a brief
  // window right after the CAD restarts/updates) - rather than leaving the admin stuck
  // looking at a dead end, retry a few times in the background before asking them to.
  React.useEffect(() => {
    if (initialCounts) return;

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;

    function scheduleNext() {
      if (cancelled || retryCountRef.current >= STATS_RETRY_DELAYS_MS.length) return;

      const delay = STATS_RETRY_DELAYS_MS[retryCountRef.current]!;
      retryCountRef.current += 1;

      timeout = setTimeout(async () => {
        if (cancelled) return;
        const succeeded = await fetchStats({ silent: true });
        if (!succeeded) scheduleNext();
      }, delay);
    }

    scheduleNext();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // only ever schedule the background retry chain off the initial SSR result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AdminLayout
      permissions={{
        permissions: [
          ...defaultPermissions.allDefaultAdminPermissions,
          ...defaultPermissions.defaultCourthousePermissions,
          ...defaultPermissions.defaultScopedAdminPermissions,
        ],
      }}
    >
      <header className="mb-6">
        <Title className="!mb-1">{t("adminDashboard")}</Title>
        <p className="text-neutral-600 dark:text-gray-400">{t("adminDashboardDescription")}</p>
      </header>

      <div className="admin-console">
        <SetupWizardCard />

        <RecoveryTokenCard />

        <UpdateCadCard />

        {counts ? null : (
          <Alert
            type="error"
            title={t("unableToLoadStatisticsTitle")}
            message={t("unableToLoadStatisticsMessage")}
          >
            <Button
              className="mt-2 flex items-center gap-2"
              disabled={isRetrying}
              onPress={() => fetchStats()}
            >
              {isRetrying ? <Loader /> : <ArrowClockwise />}
              Try again
            </Button>
          </Alert>
        )}

        {counts ? <NeedsAttention pendingUsers={counts.pendingUsers} /> : null}

        {counts ? (
          <>
            <SectionHeading>{t("overview")}</SectionHeading>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 mb-8">
              <StatCard
          title={t("users")}
          value={counts.activeUsers}
          valueLabel={t("active")}
          icon={<People size={16} />}
          accent="blue"
          details={[
            { label: t("pending"), value: counts.pendingUsers },
            { label: t("banned"), value: counts.bannedUsers },
          ]}
        />
        <StatCard
          title={t("citizens")}
          value={counts.createdCitizens}
          valueLabel={t("created")}
          icon={<PersonVcard size={16} />}
          accent="purple"
          details={[
            { label: t("inBolo"), value: counts.citizensInBolo, total: counts.createdCitizens },
            { label: t("arrested"), value: counts.arrestCitizens, total: counts.createdCitizens },
            { label: t("dead"), value: counts.deadCitizens, total: counts.createdCitizens },
          ]}
        />
        <StatCard
          title={t("vehicles")}
          value={counts.vehicles}
          valueLabel={t("registered")}
          icon={<CarFrontFill size={16} />}
          accent="amber"
          details={[
            { label: t("inBolo"), value: counts.vehiclesInBOLO, total: counts.vehicles },
            { label: t("impounded"), value: counts.impoundedVehicles, total: counts.vehicles },
          ]}
        />
        <StatCard
          title={t("leo")}
          value={counts.officerCount}
          valueLabel={t("total")}
          icon={<ShieldFill size={16} />}
          accent="green"
          details={[
            { label: t("onDuty"), value: counts.onDutyOfficers, total: counts.officerCount },
            { label: t("suspended"), value: counts.suspendedOfficers, total: counts.officerCount },
          ]}
        />
        <StatCard
          title={t("emsFd")}
          value={counts.emsDeputiesCount}
          valueLabel={t("total")}
          icon={<HeartPulseFill size={16} />}
          accent="pink"
          details={[
            {
              label: t("onDuty"),
              value: counts.onDutyEmsDeputies,
              total: counts.emsDeputiesCount,
            },
            {
              label: t("suspended"),
              value: counts.suspendedEmsFDDeputies,
              total: counts.emsDeputiesCount,
            },
          ]}
        />
        <StatCard
          title={t("images")}
          value={counts.imageData.count}
          valueLabel={t("total")}
          icon={<Images size={16} />}
          accent="gray"
          details={[
            {
              label: t("storageUsed"),
              value: prettyBytes(counts.imageData.totalSize, { binary: true }),
            },
          ]}
        />
            </div>
          </>
        ) : null}

        <QuickLinks />
      </div>

      <SetupWizardModal />
    </AdminLayout>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-gray-400">
      {children}
    </h2>
  );
}

interface StatDetail {
  label: string;
  value: number | string;
  total?: number;
}

const STAT_ACCENT_CLASSES = {
  blue: "border-l-blue-500 dark:border-l-blue-400 text-blue-600 dark:text-blue-400 bg-blue-500/10",
  purple:
    "border-l-purple-500 dark:border-l-purple-400 text-purple-600 dark:text-purple-400 bg-purple-500/10",
  amber:
    "border-l-amber-500 dark:border-l-amber-400 text-amber-600 dark:text-amber-400 bg-amber-500/10",
  green:
    "border-l-green-500 dark:border-l-green-400 text-green-600 dark:text-green-400 bg-green-500/10",
  pink: "border-l-pink-500 dark:border-l-pink-400 text-pink-600 dark:text-pink-400 bg-pink-500/10",
  gray: "border-l-neutral-500 dark:border-l-gray-400 text-neutral-600 dark:text-gray-300 bg-neutral-500/10",
} as const;

function StatCard({
  title,
  value,
  valueLabel,
  details,
  icon,
  accent,
}: {
  title: string;
  value: number | string;
  valueLabel: string;
  details: StatDetail[];
  icon: React.ReactNode;
  accent: keyof typeof STAT_ACCENT_CLASSES;
}) {
  const accentClasses = STAT_ACCENT_CLASSES[accent];
  const [borderClasses, colorClasses] = [
    accentClasses.split(" ").slice(0, 2).join(" "),
    accentClasses.split(" ").slice(2).join(" "),
  ];

  return (
    <section className={classNames("card p-4 flex flex-col border-l-[3px]", borderClasses)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-600 dark:text-gray-400">{title}</h3>
        <span className={classNames("flex items-center justify-center w-8 h-8 rounded-lg shrink-0", colorClasses)}>
          {icon}
        </span>
      </div>
      <p className="mt-1 flex items-baseline gap-2">
        <span className={classNames("text-3xl font-semibold", firaMonoFont.className)}>
          {value}
        </span>
        <span className="text-sm text-neutral-500 dark:text-gray-400">{valueLabel}</span>
      </p>

      <ul className="mt-3 pt-3 border-t border-gray-200 dark:border-quaternary space-y-1 text-sm">
        {details.map((detail) => {
          const percentage =
            typeof detail.value === "number" && detail.total
              ? Math.round((100 / detail.total) * detail.value)
              : null;

          return (
            <li key={detail.label} className="flex items-center justify-between gap-2">
              <span className="text-neutral-600 dark:text-gray-400 capitalize">
                {detail.label}
              </span>
              <span className="font-medium tabular-nums">
                {detail.value}
                {percentage !== null ? (
                  <span className="ml-1.5 text-xs text-neutral-500 dark:text-gray-500">
                    {percentage}%
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

type AdminNotifications = Record<
  | "pendingUnitsForDepartments"
  | "pendingBusinesses"
  | "pendingNameChangeRequests"
  | "pendingExpungementRequests"
  | "pendingWarrants",
  number
>;

function NeedsAttention({ pendingUsers }: { pendingUsers: number }) {
  const t = useTranslations("Management");
  const { execute } = useFetch();
  const { hasPermissions } = usePermission();
  const { data } = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: async () => {
      const { json } = await execute({ path: "/notifications/admin", noToast: true });
      return json as AdminNotifications;
    },
  });

  const items = [
    {
      label: t("pendingUsersToReview"),
      count: pendingUsers,
      href: "/admin/manage/users",
      visible: hasPermissions([Permissions.ManageUsers, Permissions.ManagePendingUsers]),
    },
    {
      label: t("pendingUnitsToReview"),
      count: data?.pendingUnitsForDepartments ?? 0,
      href: "/admin/manage/units",
      visible: hasPermissions([Permissions.ManageUnits]),
    },
    {
      label: t("pendingBusinessesToReview"),
      count: data?.pendingBusinesses ?? 0,
      href: "/admin/manage/businesses",
      visible: hasPermissions([Permissions.ManageBusinesses]),
    },
    {
      label: t("pendingCourthouseToReview"),
      count:
        (data?.pendingWarrants ?? 0) +
        (data?.pendingNameChangeRequests ?? 0) +
        (data?.pendingExpungementRequests ?? 0),
      href: "/admin/manage/courthouse",
      visible: hasPermissions(defaultPermissions.defaultCourthousePermissions),
    },
  ].filter((item) => item.visible && item.count > 0);

  return (
    <section className="mb-8">
      <SectionHeading>{t("needsAttention")}</SectionHeading>

      {items.length <= 0 ? (
        <p className="card px-4 py-3 text-neutral-600 dark:text-gray-400">{t("allCaughtUp")}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="card flex items-center gap-3 px-4 py-2.5 hover:border-blue-400 dark:hover:border-blue-500/60 transition-colors"
            >
              <span className="bg-blue-600 text-white h-6 min-w-[24px] px-2 grid place-content-center rounded-full text-sm font-semibold">
                {item.count}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

const QUICK_LINK_COLOR_CLASSES = {
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200",
  purple: "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-200",
  green: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-200",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
  pink: "bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-200",
  gray: "bg-gray-100 text-gray-700 dark:bg-secondary dark:text-gray-300",
} as const;

function QuickLinks() {
  const t = useTranslations("Management");
  const { hasPermissions } = usePermission();

  const links = [
    {
      href: "/admin/manage/users",
      title: t("MANAGE_USERS"),
      description: t("quickLinkUsers"),
      icon: <People aria-hidden className="w-5 h-5" />,
      color: "blue",
      permissions: [Permissions.ViewUsers, Permissions.ManageUsers, Permissions.ManagePendingUsers],
    },
    {
      href: "/admin/manage/citizens",
      title: t("MANAGE_CITIZENS"),
      description: t("quickLinkCitizens"),
      icon: <PersonVcard aria-hidden className="w-5 h-5" />,
      color: "purple",
      permissions: [Permissions.ViewCitizens, Permissions.ManageCitizens],
    },
    {
      href: "/admin/manage/units",
      title: t("MANAGE_UNITS"),
      description: t("quickLinkUnits"),
      icon: <PersonBadge aria-hidden className="w-5 h-5" />,
      color: "green",
      permissions: [Permissions.ViewUnits, Permissions.ManageUnits],
    },
    {
      href: "/admin/manage/cad-settings",
      title: t("MANAGE_CAD_SETTINGS"),
      description: t("quickLinkCadSettings"),
      icon: <Gear aria-hidden className="w-5 h-5" />,
      color: "gray",
      permissions: [Permissions.ManageCADSettings],
    },
    {
      href: "/admin/values/department",
      title: t("quickLinkValuesTitle"),
      description: t("quickLinkValues"),
      icon: <DatabaseGear aria-hidden className="w-5 h-5" />,
      color: "amber",
      permissions: defaultPermissions.defaultValuePermissions,
    },
    {
      href: "/admin/manage/audit-logs",
      title: t("MANAGE_AUDIT_LOGS"),
      description: t("quickLinkAuditLogs"),
      icon: <JournalText aria-hidden className="w-5 h-5" />,
      color: "pink",
      permissions: defaultPermissions.allDefaultAdminPermissions,
    },
  ].filter((link) => hasPermissions(link.permissions)) as Array<{
    href: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: keyof typeof QUICK_LINK_COLOR_CLASSES;
    permissions: Permissions[];
  }>;

  if (links.length <= 0) return null;

  return (
    <section>
      <SectionHeading>{t("quickLinks")}</SectionHeading>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="card group flex items-start gap-3 p-4 hover:border-blue-400 dark:hover:border-blue-500/60 transition-colors"
          >
            <span
              className={classNames(
                "mt-0.5 rounded-lg p-2",
                QUICK_LINK_COLOR_CLASSES[link.color],
              )}
            >
              {link.icon}
            </span>
            <span className="flex flex-col">
              <span className="font-semibold flex items-center gap-1">
                {link.title}
                <ArrowRightShort
                  aria-hidden
                  className="w-5 h-5 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0"
                />
              </span>
              <span className="text-sm text-neutral-600 dark:text-gray-400">
                {link.description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ locale, res, req }) => {
  const user = await getSessionUser(req);
  const [data] = await requestAll(req, [["/admin", null]]);

  // https://nextjs.org/docs/going-to-production#caching
  res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=59");

  return {
    props: {
      counts: data,
      session: user,
      messages: {
        // English fallback for the recovery strings (only en/recovery.json exists for now)
        ...(await getTranslations(["recovery"], "en")),
        ...(await getTranslations(["admin", "values", "common", "recovery"], user?.locale ?? locale)),
      },
    },
  };
};
