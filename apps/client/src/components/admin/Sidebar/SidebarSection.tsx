import * as React from "react";
import { usePermission, type Permissions } from "hooks/usePermission";
import { classNames } from "lib/classNames";
import type { ReactNode } from "react";
import { ChevronDown } from "react-bootstrap-icons";

interface Props {
  permissions?: Permissions[];
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  marginTop?: "mt-6" | "mt-4";
  /** when set, the section can be collapsed. The open state is remembered per browser. */
  collapsibleId?: string;
  defaultOpen?: boolean;
  /** forces the section open (e.g. while searching) */
  forceOpen?: boolean;
}

const STORAGE_PREFIX = "snailycad_admin_sidebar_";

export function SidebarSection({
  icon,
  title,
  marginTop,
  permissions,
  children,
  collapsibleId,
  defaultOpen = true,
  forceOpen = false,
}: Props) {
  const { hasPermissions } = usePermission();
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  React.useEffect(() => {
    if (!collapsibleId) return;

    try {
      const stored = window.localStorage.getItem(`${STORAGE_PREFIX}${collapsibleId}`);
      if (stored !== null) setIsOpen(stored === "true");
    } catch {
      // storage unavailable: keep the default
    }
  }, [collapsibleId]);

  React.useEffect(() => {
    if (defaultOpen) setIsOpen(true);
  }, [defaultOpen]);

  function toggle() {
    setIsOpen((prev) => {
      try {
        window.localStorage.setItem(`${STORAGE_PREFIX}${collapsibleId}`, String(!prev));
      } catch {
        // storage unavailable: only remembered for this page
      }
      return !prev;
    });
  }

  if (permissions && !hasPermissions(permissions)) {
    return null;
  }

  const open = !collapsibleId || isOpen || forceOpen;
  const heading = (
    <>
      {icon ? (
        <span aria-hidden className="text-neutral-500 dark:text-gray-400">
          {icon}
        </span>
      ) : null}
      <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-gray-400">
        {title}
      </h2>
    </>
  );

  return (
    <section className={classNames("first:mt-0 w-full", marginTop === "mt-4" ? "mt-4" : "mt-5")}>
      {collapsibleId ? (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex w-full items-center gap-2 px-3 py-1 rounded-md hover:bg-gray-200/70 dark:hover:bg-secondary/60"
        >
          {heading}
          <ChevronDown
            aria-hidden
            className={classNames(
              "ml-auto w-3 h-3 text-neutral-500 transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      ) : (
        <header className="flex items-center gap-2 px-3 py-1">{heading}</header>
      )}

      {open ? <ul className="flex flex-col space-y-0.5 mt-1.5">{children}</ul> : null}
    </section>
  );
}
