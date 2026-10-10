import * as React from "react";
import Link from "next/link";
import { useTranslations } from "use-intl";
import { Alert, Button, buttonVariants } from "@snailycad/ui";
import { useAuth } from "context/AuthContext";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";

const DISMISSED_STORAGE_KEY = "snailycad_api_token_reminder_dismissed";

function getDismissedKey(userId: string) {
  return `${DISMISSED_STORAGE_KEY}_${userId}`;
}

/**
 * reminds the authenticated user to set up their personal (user) API token, which is used by
 * in-game integrations (FiveM). Only rendered when the `API_TOKEN_REMINDER` feature is enabled
 * and the user has no (enabled) API token.
 */
export function ApiTokenReminder() {
  const { user } = useAuth();
  const { API_TOKEN_REMINDER } = useFeatureEnabled();
  const t = useTranslations("Common");

  // `null` = not yet read from storage. Avoids flashing the banner before the stored value is known.
  const [dismissed, setDismissed] = React.useState<boolean | null>(null);

  const userId = user?.id ?? null;
  const hasApiToken = Boolean(user?.apiToken?.enabled && user.apiToken.token);

  React.useEffect(() => {
    if (!userId) return;

    try {
      setDismissed(window.localStorage.getItem(getDismissedKey(userId)) === "true");
    } catch {
      setDismissed(false);
    }
  }, [userId]);

  function handleDismiss() {
    setDismissed(true);
    if (!userId) return;

    try {
      window.localStorage.setItem(getDismissedKey(userId), "true");
    } catch {
      // storage unavailable: the banner stays dismissed for this page session only
    }
  }

  if (!API_TOKEN_REMINDER || !user || hasApiToken || dismissed !== false) {
    return null;
  }

  return (
    <Alert className="my-2" type="info" title={t("apiTokenReminderTitle")}>
      <p>{t("apiTokenReminderMessage")}</p>

      <div className="flex flex-wrap items-center gap-2 mt-2">
        <Link
          href="/account?tab=userApiToken"
          className={buttonVariants({ size: "xs", variant: "blue" })}
        >
          {t("apiTokenReminderAction")}
        </Link>
        <Button size="xs" variant="transparent" className="text-white" onPress={handleDismiss}>
          {t("dismiss")}
        </Button>
      </div>
    </Alert>
  );
}
