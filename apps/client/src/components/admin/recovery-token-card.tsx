import * as React from "react";
import { useTranslations } from "next-intl";
import { Rank } from "@snailycad/types";
import { Alert, Button, Loader } from "@snailycad/ui";
import Link from "next/link";
import useFetch from "lib/useFetch";
import { useAuth } from "context/AuthContext";

/**
 * Owner-only recovery token card on the admin dashboard (roadmap 2.2).
 * The token is shown only while it has not been acknowledged, or once right after a rotation.
 */

interface RecoveryTokenData {
  tokenAcknowledged: boolean;
  createdAt: string | null;
  path: string;
  token: string | null;
}

export function RecoveryTokenCard() {
  const { user } = useAuth();
  const t = useTranslations("Recovery");
  const { execute, state } = useFetch();

  const [data, setData] = React.useState<RecoveryTokenData | null>(null);
  const [isConfirmingRotate, setIsConfirmingRotate] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const isOwner = user?.rank === Rank.OWNER;

  React.useEffect(() => {
    if (!isOwner) return;

    (async () => {
      const { json } = await execute<RecoveryTokenData | null>({
        path: "/admin/recovery-token",
        method: "GET",
        noToast: true,
      });

      if (json && typeof json === "object" && "path" in json) {
        setData(json);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner]);

  if (!isOwner || !data) return null;

  async function handleAcknowledge() {
    const { json } = await execute<boolean>({
      path: "/admin/recovery-token/acknowledge",
      method: "POST",
    });

    if (json === true) {
      setData((prev) => (prev ? { ...prev, token: null, tokenAcknowledged: true } : prev));
      setCopied(false);
    }
  }

  async function handleRotate() {
    const { json } = await execute<RecoveryTokenData>({
      path: "/admin/recovery-token/rotate",
      method: "POST",
    });

    if (json && typeof json === "object" && json.token) {
      setData(json);
      setIsConfirmingRotate(false);
      setCopied(false);
    }
  }

  async function handleCopy() {
    if (!data?.token) return;
    try {
      // the Clipboard API is only available in secure contexts (HTTPS/localhost)
      if (window.isSecureContext && navigator.clipboard) {
        await navigator.clipboard.writeText(data.token);
        setCopied(true);
        return;
      }
    } catch {
      // fall back below
    }

    setCopied(legacyCopy(data.token));
  }

  if (data.token && !data.tokenAcknowledged) {
    return (
      <Alert type="warning" className="mb-6" title={t("adminTokenTitle")}>
        <p>{t("adminTokenDescription")}</p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 my-3">
          <code className="px-2 py-1 rounded-md bg-white/70 break-all select-all font-mono">
            {data.token}
          </code>
          <Button size="xs" onPress={handleCopy} className="shrink-0">
            {copied ? t("adminTokenCopied") : t("adminTokenCopy")}
          </Button>
        </div>

        <p className="text-sm">
          {t("adminTokenStoredAt")} <code className="break-all">{data.path}</code>
        </p>

        <div className="mt-3">
          <Button
            variant="success"
            size="xs"
            isDisabled={state === "loading"}
            onPress={handleAcknowledge}
          >
            {state === "loading" ? <Loader className="mr-2 inline-block" /> : null}
            {t("adminTokenSaved")}
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <section className="mb-6 p-3 rounded-md border border-gray-300 dark:border-secondary text-sm">
      <header className="flex items-center justify-between gap-2">
        <h4 className="text-base uppercase font-semibold text-neutral-700 dark:text-gray-300">
          {t("adminTokenManage")}
        </h4>
        {isConfirmingRotate ? null : (
          <Button size="xs" onPress={() => setIsConfirmingRotate(true)}>
            {t("adminTokenRotate")}
          </Button>
        )}
      </header>

      <p className="mt-1 text-neutral-700 dark:text-gray-300">{t("adminTokenManageDescription")}</p>
      <p className="mt-1">
        {t("adminTokenStoredAt")} <code className="break-all">{data.path}</code>
      </p>
      <Link href="/auth/recovery" className="underline mt-1 inline-block">
        /auth/recovery
      </Link>

      {isConfirmingRotate ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span>{t("adminTokenRotateConfirm")}</span>
          <Button
            size="xs"
            variant="danger"
            isDisabled={state === "loading"}
            onPress={handleRotate}
          >
            {state === "loading" ? <Loader className="mr-2 inline-block" /> : null}
            {t("adminTokenRotate")}
          </Button>
          <Button size="xs" variant="cancel" onPress={() => setIsConfirmingRotate(false)}>
            {t("cancel")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

/** copy fallback for plain-HTTP sites where `navigator.clipboard` is unavailable */
function legacyCopy(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  document.body.removeChild(textarea);
  return copied;
}
