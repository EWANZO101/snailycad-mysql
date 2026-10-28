import * as React from "react";
import { useRouter } from "next/router";
import { useTranslations } from "use-intl";
import { Search } from "react-bootstrap-icons";
import { Permissions } from "@snailycad/permissions";
import { Loader } from "@snailycad/ui";
import { Modal } from "components/modal/Modal";
import { usePermission } from "hooks/usePermission";
import { classNames } from "lib/classNames";
import useFetch from "lib/useFetch";
import { type Full911Call, useCall911State } from "state/dispatch/call-911-state";
import { useModal } from "state/modalState";
import { ModalIds } from "types/modal-ids";

interface QuickSearchData {
  citizens: {
    id: string;
    name: string;
    surname: string;
    dateOfBirth: string;
    socialSecurityNumber: string | null;
  }[];
  vehicles: {
    id: string;
    plate: string;
    vinNumber: string;
    model: { value: { value: string } } | null;
    citizen: { name: string; surname: string } | null;
  }[];
  weapons: {
    id: string;
    serialNumber: string;
    model: { value: { value: string } } | null;
    citizen: { name: string; surname: string } | null;
  }[];
  calls: {
    id: string;
    caseNumber: number;
    location: string;
    postal: string | null;
    name: string;
  }[];
}

type Result =
  | { kind: "citizen"; id: string; label: string; detail: string; name: string }
  | { kind: "vehicle"; id: string; label: string; detail: string; plate: string }
  | { kind: "weapon"; id: string; label: string; detail: string; serialNumber: string }
  | { kind: "call"; id: string; label: string; detail: string }
  | { kind: "page"; id: string; label: string; detail: string; href: string };

const EMPTY: QuickSearchData = { citizens: [], vehicles: [], weapons: [], calls: [] };
const UNIT_PAGES = ["/officer", "/dispatch", "/ems-fd"];

/**
 * Ctrl/Cmd + K (or the search button in the navbar): suggestions while typing for citizens, plates,
 * weapon serials, active 911 calls and pages, then opens the matching search window.
 */
export function QuickSearch() {
  const t = useTranslations("QuickSearch");
  const router = useRouter();
  const modalState = useModal();
  const { hasPermissions } = usePermission();
  const { execute, state } = useFetch();
  const call911State = useCall911State((state) => ({
    calls: state.calls,
    setCurrentlySelectedCall: state.setCurrentlySelectedCall,
  }));

  const isLeo = hasPermissions([Permissions.Leo]);
  const isDispatch = hasPermissions([Permissions.Dispatch]);
  const isEmsFd = hasPermissions([Permissions.EmsFd]);
  const canUse = isLeo || isDispatch || isEmsFd;
  const homePage = isLeo ? "/officer" : isDispatch ? "/dispatch" : "/ems-fd";

  const [query, setQuery] = React.useState("");
  const [data, setData] = React.useState<QuickSearchData>(EMPTY);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const latestQuery = React.useRef("");
  const isOpen = modalState.isOpen(ModalIds.QuickSearch);

  const pages = React.useMemo(() => {
    const list: Extract<Result, { kind: "page" }>[] = [];
    if (isLeo) list.push({ kind: "page", id: "officer", label: t("pageOfficer"), detail: "/officer", href: "/officer" });
    if (isDispatch) list.push({ kind: "page", id: "dispatch", label: t("pageDispatch"), detail: "/dispatch", href: "/dispatch" });
    if (isEmsFd) list.push({ kind: "page", id: "ems-fd", label: t("pageEmsFd"), detail: "/ems-fd", href: "/ems-fd" });
    if (isLeo) list.push({ kind: "page", id: "incidents", label: t("pageIncidents"), detail: "/officer/incidents", href: "/officer/incidents" });
    if (isLeo || isDispatch) list.push({ kind: "page", id: "calls", label: t("pageCallHistory"), detail: "/dispatch/call-history", href: "/dispatch/call-history" });
    list.push({ kind: "page", id: "citizens", label: t("pageCitizens"), detail: "/citizen", href: "/citizen" });
    return list;
  }, [isLeo, isDispatch, isEmsFd, t]);

  const results = React.useMemo<Result[]>(() => {
    const words = query.trim().toLowerCase();
    const matchingPages = words.length
      ? pages.filter((page) => page.label.toLowerCase().includes(words))
      : pages;

    return [
      ...data.citizens.map((c) => ({
        kind: "citizen" as const,
        id: c.id,
        label: `${c.name} ${c.surname}`,
        detail: [new Date(c.dateOfBirth).toLocaleDateString(), c.socialSecurityNumber]
          .filter(Boolean)
          .join(" · "),
        name: `${c.name} ${c.surname}`,
      })),
      ...data.vehicles.map((v) => ({
        kind: "vehicle" as const,
        id: v.id,
        label: v.plate.toUpperCase(),
        detail: [v.model?.value.value, v.citizen ? `${v.citizen.name} ${v.citizen.surname}` : null]
          .filter(Boolean)
          .join(" · "),
        plate: v.plate,
      })),
      ...data.weapons.map((w) => ({
        kind: "weapon" as const,
        id: w.id,
        label: w.serialNumber,
        detail: [w.model?.value.value, w.citizen ? `${w.citizen.name} ${w.citizen.surname}` : null]
          .filter(Boolean)
          .join(" · "),
        serialNumber: w.serialNumber,
      })),
      ...data.calls.map((c) => ({
        kind: "call" as const,
        id: c.id,
        label: `#${c.caseNumber} ${c.location}`,
        detail: [c.postal, c.name].filter(Boolean).join(" · "),
      })),
      ...matchingPages,
    ];
  }, [data, pages, query]);

  // Ctrl/Cmd + K opens it from anywhere
  React.useEffect(() => {
    if (!canUse) return;
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        modalState.openModal(ModalIds.QuickSearch);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canUse, modalState]);

  // debounced suggestions; answers to older queries are ignored
  React.useEffect(() => {
    const trimmed = query.trim();
    latestQuery.current = trimmed;
    setActiveIndex(0);

    if (trimmed.length < 2) {
      setData(EMPTY);
      return;
    }

    const timeout = window.setTimeout(async () => {
      const { json } = await execute<QuickSearchData>({
        path: `/quick-search?query=${encodeURIComponent(trimmed)}`,
        noToast: true,
      });
      if (latestQuery.current === trimmed && json && "citizens" in json) setData(json);
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  // a result chosen on another page opens once the unit page has loaded
  React.useEffect(() => {
    const { qs, value, name } = router.query;
    if (typeof qs !== "string" || typeof value !== "string") return;
    if (!UNIT_PAGES.includes(router.pathname)) return;

    const timeout = window.setTimeout(() => {
      openResultHere(qs, value, typeof name === "string" ? name : value);
      const { qs: _qs, value: _value, name: _name, ...rest } = router.query;
      router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [router.query.qs, router.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  async function openResultHere(kind: string, value: string, name: string) {
    if (kind === "citizen") modalState.openModal(ModalIds.NameSearch, { id: value, name });
    if (kind === "vehicle") modalState.openModal(ModalIds.VehicleSearch, { vinNumber: value });
    if (kind === "weapon") modalState.openModal(ModalIds.WeaponSearch, { serialNumber: value });
    if (kind === "call") {
      let call = call911State.calls.find((c) => c.id === value) ?? null;
      if (!call) {
        const { json } = await execute<Full911Call>({ path: `/911-calls/${value}`, noToast: true });
        call = json?.id ? json : null;
      }
      if (call) {
        call911State.setCurrentlySelectedCall(call);
        modalState.openModal(ModalIds.Manage911Call, call);
      }
    }
  }

  function handleSelect(result: Result) {
    modalState.closeModal(ModalIds.QuickSearch);
    setQuery("");

    if (result.kind === "page") {
      router.push(result.href);
      return;
    }

    const value =
      result.kind === "vehicle"
        ? result.plate
        : result.kind === "weapon"
          ? result.serialNumber
          : result.id;
    const name = result.kind === "citizen" ? result.name : value;

    if (UNIT_PAGES.includes(router.pathname) && (result.kind === "call" || router.pathname !== "/ems-fd")) {
      openResultHere(result.kind, value, name);
    } else {
      router.push({ pathname: homePage, query: { qs: result.kind, value, name } });
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      const result = results.at(activeIndex);
      if (result) {
        event.preventDefault();
        handleSelect(result);
      }
    }
  }

  if (!canUse) return null;

  const groups: { kind: Result["kind"]; title: string }[] = [
    { kind: "citizen", title: t("citizens") },
    { kind: "vehicle", title: t("vehicles") },
    { kind: "weapon", title: t("weapons") },
    { kind: "call", title: t("calls") },
    { kind: "page", title: t("pages") },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => modalState.openModal(ModalIds.QuickSearch)}
        className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-md border border-gray-200 dark:border-quaternary text-sm text-neutral-500 dark:text-gray-400 hover:text-neutral-800 dark:hover:text-white transition-colors"
        aria-label={t("open")}
      >
        <Search aria-hidden className="w-3.5 h-3.5" />
        <span className="hidden lg:inline">{t("placeholderShort")}</span>
        <kbd className="hidden lg:inline text-xs px-1.5 py-0.5 rounded border border-gray-200 dark:border-quaternary">
          Ctrl K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => modalState.openModal(ModalIds.QuickSearch)}
        className="sm:hidden grid place-content-center w-9 h-9 rounded-md text-neutral-600 dark:text-gray-300"
        aria-label={t("open")}
      >
        <Search aria-hidden className="w-4 h-4" />
      </button>

      <Modal
        title={t("title")}
        isOpen={isOpen}
        onClose={() => {
          modalState.closeModal(ModalIds.QuickSearch);
          setQuery("");
        }}
        className="w-[640px]"
      >
        <div className="relative">
          <Search
            aria-hidden
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400"
          />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            className="w-full h-11 pl-9 pr-9 rounded-md bg-gray-100 dark:bg-primary border border-gray-200 dark:border-quaternary outline-none focus:border-blue-500"
          />
          {state === "loading" ? (
            <Loader className="absolute right-3 top-1/2 -translate-y-1/2" />
          ) : null}
        </div>

        <div className="mt-3 max-h-[420px] overflow-y-auto thin-scrollbar" role="listbox">
          {query.trim().length >= 2 && results.length <= 0 && state !== "loading" ? (
            <p className="py-6 text-center text-neutral-500 dark:text-gray-400">{t("noResults")}</p>
          ) : null}

          {groups.map((group) => {
            const items = results.filter((result) => result.kind === group.kind);
            if (items.length <= 0) return null;

            return (
              <section key={group.kind} className="mb-2">
                <h3 className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-gray-400">
                  {group.title}
                </h3>
                {items.map((result) => {
                  const index = results.indexOf(result);
                  return (
                    <button
                      key={`${result.kind}-${result.id}`}
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => handleSelect(result)}
                      className={classNames(
                        "w-full text-left px-3 py-2 rounded-md flex items-center justify-between gap-3",
                        index === activeIndex ? "bg-gray-200 dark:bg-secondary" : "",
                      )}
                    >
                      <span className="font-medium truncate">{result.label}</span>
                      <span className="text-sm text-neutral-500 dark:text-gray-400 truncate">
                        {result.detail}
                      </span>
                    </button>
                  );
                })}
              </section>
            );
          })}
        </div>

        <p className="mt-2 text-xs text-neutral-500 dark:text-gray-400">{t("hint")}</p>
      </Modal>
    </>
  );
}
