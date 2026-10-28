import { useRouter } from "next/router";
import { ChevronDown } from "react-bootstrap-icons";
import { useTranslations } from "next-intl";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLinkItem,
  DropdownMenuTrigger,
} from "@snailycad/ui";
import { classNames } from "lib/classNames";

export function DotDropdown() {
  const router = useRouter();
  const t = useTranslations("Nav");
  const isActive = (route: string) => router.pathname.startsWith(route);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          role="listitem"
          className={classNames(
            "flex gap-1 items-center px-2",
            isActive("/dot") && "font-semibold bg-gray-100 dark:bg-secondary",
          )}
          variant="transparent"
        >
          {t("dot")}
          <span className="mt-1 ml-1">
            <ChevronDown width={15} height={15} className="text-gray-700 dark:text-gray-300" />
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="min-w-[200px]" align="start" alignOffset={10}>
        <DropdownMenuLinkItem href="/dot">{t("dashboard")}</DropdownMenuLinkItem>
        <DropdownMenuLinkItem href="/dot/my-units">{t("myUnits")}</DropdownMenuLinkItem>
        <DropdownMenuLinkItem href="/dot/my-unit-logs">{t("myUnitLogs")}</DropdownMenuLinkItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
