import * as React from "react";

interface Props {
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** consistent icon + title header used at the top of every CAD Settings tab. */
export function SettingsTabHeader({ icon, children, className }: Props) {
  return (
    <header className={`flex items-center gap-3 mb-4 ${className ?? ""}`}>
      <span className="shrink-0 w-10 h-10 rounded-lg grid place-content-center bg-blue-500/10 text-blue-600 dark:text-blue-400">
        {icon}
      </span>
      <h2 className="text-2xl font-semibold">{children}</h2>
    </header>
  );
}
