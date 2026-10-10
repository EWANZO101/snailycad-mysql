import * as React from "react";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";
import { classNames } from "lib/classNames";
import Link from "next/link";
import { useRouter } from "next/router";
import { useTranslations } from "use-intl";
import { useViewport } from "@casperiv/useful/hooks/useViewport";
import {
  importRoutes,
  managementRouteGroups,
  managementRoutes,
  type SidebarGroup,
  type SidebarRoute,
  valueRoutes,
} from "./Sidebar/routes";
import { usePermission } from "hooks/usePermission";
import { defaultPermissions, Permissions } from "@snailycad/permissions";
import { SidebarSection } from "./Sidebar/SidebarSection";
import useFetch from "lib/useFetch";
import { useQuery } from "@tanstack/react-query";
import {
  Building,
  DatabaseAdd,
  DatabaseGear,
  Gear,
  People,
  PersonBadge,
  Speedometer2,
} from "react-bootstrap-icons";

const groupNames: SidebarGroup[] = ["people", "units", "community", "system"];
const groupIcons: Record<SidebarGroup, React.ReactNode> = {
  people: <People className="w-4 h-4" aria-hidden />,
  units: <PersonBadge className="w-4 h-4" aria-hidden />,
  community: <Building className="w-4 h-4" aria-hidden />,
  system: <Gear className="w-4 h-4" aria-hidden />,
};

type AdminNotificationKeys =
  | "pendingUnitsForDepartments"
  | "pendingBusinesses"
  | "pendingNameChangeRequests"
  | "pendingExpungementRequests"
  | "pendingWarrants";

export function AdminSidebar() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const viewport = useViewport();

  const { execute } = useFetch();
  const { data } = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: async () => {
      const { json } = await execute({ path: "/notifications/admin", noToast: true });
      return json as Record<AdminNotificationKeys, number>;
    },
  });

  const notificationsForPath = data
    ? ({
        "/admin/manage/units": data.pendingUnitsForDepartments,
        "/admin/manage/businesses": data.pendingBusinesses,
        "/admin/manage/courthouse":
          data.pendingWarrants + data.pendingNameChangeRequests + data.pendingExpungementRequests,
      } as Partial<Record<string, number | undefined>>)
    : {};

  const t = useTranslations();
  const man = useTranslations("Management");
  const router = useRouter();

  function isMActive(path: string) {
    return router.pathname === path;
  }

  function isImportActive(type: string) {
    return router.asPath.includes("import") && router.asPath.endsWith(type.toLowerCase());
  }

  function isValueActive(type: string) {
    return router.asPath === `/admin/values/${type.toLowerCase()}`;
  }

  function makeType(t: string) {
    return t.replace(/_/g, "-").toLowerCase();
  }

  React.useEffect(() => {
    if (viewport > 900) {
      setMenuOpen(false);
    }
  }, [viewport]);

  return (
    <div className="w-7 nav:w-72">
      <aside
        style={{ height: "calc(100vh - 3.5rem)" }}
        className={classNames(
          "top-14 pt-4 pb-3 px-2 bg-white border-r border-gray-200 dark:border-quaternary dark:bg-tertiary flex flex-col overflow-x-hidden overflow-y-auto transition-[width] duration-100 thin-scrollbar",
          menuOpen
            ? "fixed z-40 w-72 justify-start items-start"
            : "sticky w-14 nav:w-72 justify-end nav:justify-start items-center nav:items-start",
        )}
      >
        <div className={menuOpen ? "block" : "hidden nav:block w-full"} id="sidebar-content">
          <div className="px-1 mb-4">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={man("searchAdminPages")}
              aria-label={man("searchAdminPages")}
              className="w-full px-3 py-1.5 text-sm rounded-lg border outline-none bg-white dark:bg-secondary dark:text-white border-gray-200 dark:border-quinary focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <ul className="flex flex-col mb-2">
            <SidebarItem
              route={null}
              isActive={router.pathname === "/admin"}
              href="/admin"
              text={man("adminDashboard")}
              onRouteClick={() => setMenuOpen(false)}
              icon={<Speedometer2 className="w-4 h-4" aria-hidden />}
              search={search}
            />
          </ul>

          {groupNames.map((group) => (
            <SidebarSection
              key={group}
              permissions={[
                ...defaultPermissions.defaultManagementPermissions,
                ...defaultPermissions.defaultOwnerPermissions,
                ...defaultPermissions.defaultCourthousePermissions,
                ...defaultPermissions.defaultScopedAdminPermissions,
              ]}
              icon={groupIcons[group]}
              title={man(`group_${group}`)}
            >
              {managementRouteGroups[group].map((type) => {
                if (type === "CAD_SETTINGS") {
                  return (
                    <SidebarItem
                      key={type}
                      route={{ permissions: [Permissions.ManageCADSettings], type: "CAD_SETTINGS" }}
                      isActive={isMActive("/admin/manage/cad-settings")}
                      href="/admin/manage/cad-settings"
                      text={man("MANAGE_CAD_SETTINGS")}
                      onRouteClick={() => setMenuOpen(false)}
                      search={search}
                    />
                  );
                }

                const route = managementRoutes.find((route) => route.type === type);
                if (!route) return null;

                return (
                  <SidebarItem
                    route={route}
                    key={route.type}
                    isActive={isMActive(`/admin/manage/${makeType(route.type)}`)}
                    href={`/admin/manage/${makeType(route.type)}`}
                    text={man(`MANAGE_${route.type}`)}
                    onRouteClick={() => setMenuOpen(false)}
                    notificationCount={
                      notificationsForPath[`/admin/manage/${makeType(route.type)}`]
                    }
                    search={search}
                  />
                );
              })}
            </SidebarSection>
          ))}

          <SidebarSection
            permissions={defaultPermissions.defaultImportPermissions}
            title={man("import")}
            icon={<DatabaseAdd className="w-4 h-4" aria-hidden />}
            collapsibleId="import"
            defaultOpen={router.pathname.startsWith("/admin/import")}
            forceOpen={Boolean(search)}
          >
            {importRoutes.map((route) => {
              return (
                <SidebarItem
                  route={route}
                  key={route.type}
                  isActive={isImportActive(route.type)}
                  href={`/admin/import/${route.type.toLowerCase()}`}
                  text={man(`IMPORT_${route.type}`)}
                  onRouteClick={() => setMenuOpen(false)}
                  search={search}
                />
              );
            })}
          </SidebarSection>

          <SidebarSection
            permissions={defaultPermissions.defaultValuePermissions}
            title={t("Values.values")}
            icon={<DatabaseGear className="w-4 h-4" aria-hidden />}
            collapsibleId="values"
            defaultOpen={router.pathname.startsWith("/admin/values")}
            forceOpen={Boolean(search)}
          >
            {valueRoutes.map((route) => {
              return (
                <SidebarItem
                  route={route}
                  key={route.type}
                  isActive={isValueActive(makeType(route.type))}
                  href={`/admin/values/${makeType(route.type).toLowerCase()}`}
                  text={t(`${route.type.replace(/-/g, "_")}.MANAGE`)}
                  onRouteClick={() => setMenuOpen(false)}
                  search={search}
                />
              );
            })}
          </SidebarSection>
        </div>

        <button
          type="button"
          aria-label="Open sidebar"
          onClick={() => setMenuOpen((o) => !o)}
          className={classNames("flex flex-col nav:hidden w-7", menuOpen ? "mt-5 ml-3" : "mb-10")}
        >
          <span className="my-0.5 rounded-md h-0.5 w-full bg-neutral-800 dark:bg-white" />
          <span className="my-0.5 rounded-md h-0.5 w-full bg-neutral-800 dark:bg-white" />
          <span className="my-0.5 rounded-md h-0.5 w-full bg-neutral-800 dark:bg-white" />
        </button>
      </aside>
    </div>
  );
}

interface ItemProps {
  isActive: boolean;
  text: string;
  href: string;
  onRouteClick(): void;
  route: SidebarRoute | null;
  notificationCount?: number;
  icon?: React.ReactNode;
  search?: string;
}

function SidebarItem({
  route,
  href,
  text,
  isActive,
  notificationCount,
  onRouteClick,
  icon,
  search,
}: ItemProps) {
  const features = useFeatureEnabled();
  const { hasPermissions } = usePermission();

  if (route && (route.hidden?.(features) || !hasPermissions(route.permissions))) {
    return null;
  }

  const query = search?.trim().toLowerCase();
  if (query && !text.toLowerCase().includes(query)) {
    return null;
  }

  return (
    <li className="px-2">
      <Link
        prefetch={false}
        onClick={onRouteClick}
        className={classNames(
          "flex items-center gap-2 transition-colors rounded-lg px-3 py-1.5 text-[15px] text-neutral-700 dark:text-gray-300 hover:bg-gray-100 hover:text-neutral-900 dark:hover:bg-secondary/70 dark:hover:text-white",
          isActive &&
            "bg-blue-50 text-blue-700 font-medium dark:bg-blue-500/15 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-500/15",
        )}
        href={href}
      >
        {icon}
        <span className="truncate">{text}</span>
        {notificationCount ? (
          <span className="ml-auto bg-blue-600 text-white h-5 min-w-[20px] px-1.5 grid place-content-center rounded-full text-xs font-semibold">
            {notificationCount}
          </span>
        ) : null}
      </Link>
    </li>
  );
}
