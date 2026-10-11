import * as React from "react";
import axios from "axios";
import Link from "next/link";
import type { GetServerSideProps } from "next";
import { useTranslations } from "next-intl";
import { Alert, Button, Loader, TextField } from "@snailycad/ui";
import { getAPIUrl } from "@snailycad/utils/api-url";
import { getTranslations } from "lib/getTranslation";
import { Title } from "components/shared/Title";
import { classNames } from "lib/classNames";
import {
  ArrowLeft,
  CheckCircleFill,
  ChevronDown,
  Database,
  Discord,
  ExclamationTriangleFill,
  Eye,
  EyeSlash,
  Gear,
  Key,
  KeyFill,
  ListCheck,
  LockFill,
  PeopleFill,
  PersonCheckFill,
  PersonFill,
  PhoneFill,
  Search,
  ShieldCheck,
  ShieldLockFill,
  Sliders,
  StarFill,
  Steam,
  UnlockFill,
} from "react-bootstrap-icons";

/**
 * Recovery tools (roadmap 2.1). Authenticated only by the server-side recovery token.
 * The token is kept in memory only and sent with the `x-recovery-token` header.
 */

interface RecoveryStatus {
  cadName: string | null;
  whitelisted: boolean;
  features: Record<
    | "ALLOW_REGULAR_LOGIN"
    | "DISCORD_AUTH"
    | "STEAM_OAUTH"
    | "FORCE_DISCORD_AUTH"
    | "FORCE_STEAM_AUTH",
    boolean
  >;
}

interface RecoveryUser {
  id: string;
  username: string;
  rank: string;
  banned: boolean;
  whitelistStatus: string;
  discordId: string | null;
  steamId: string | null;
  hasTempPassword: boolean;
  has2FA: boolean;
}

type CadActionKey = "enableRegularLogin" | "disableForcedOAuth" | "disableWhitelist";
type UserActionKey =
  | "resetPassword"
  | "disable2FA"
  | "unlinkDiscord"
  | "unlinkSteam"
  | "restoreUserAccess"
  | "makeOwner";

const CAD_ACTIONS: { key: CadActionKey; path: string }[] = [
  { key: "enableRegularLogin", path: "/recovery/actions/enable-regular-login" },
  { key: "disableForcedOAuth", path: "/recovery/actions/disable-forced-oauth" },
  { key: "disableWhitelist", path: "/recovery/actions/disable-whitelist" },
];

const USER_ACTIONS: { key: UserActionKey; path: string; danger?: boolean }[] = [
  { key: "resetPassword", path: "/recovery/actions/reset-password" },
  { key: "disable2FA", path: "/recovery/actions/disable-2fa" },
  { key: "unlinkDiscord", path: "/recovery/actions/unlink-discord" },
  { key: "unlinkSteam", path: "/recovery/actions/unlink-steam" },
  { key: "restoreUserAccess", path: "/recovery/actions/restore-user-access" },
  { key: "makeOwner", path: "/recovery/actions/make-owner", danger: true },
];

const KNOWN_ERRORS = ["invalidRecoveryToken", "recoveryRateLimited"] as const;

export default function RecoveryPage() {
  const t = useTranslations("Recovery");

  const [tokenInput, setTokenInput] = React.useState("");
  const [showToken, setShowToken] = React.useState(false);
  const [token, setToken] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<RecoveryStatus | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<string | null>(null);

  const [query, setQuery] = React.useState("");
  const [users, setUsers] = React.useState<RecoveryUser[] | null>(null);
  const [selectedUser, setSelectedUser] = React.useState<RecoveryUser | null>(null);

  function parseError(err: unknown) {
    if (axios.isAxiosError(err)) {
      const message = (err.response?.data as { message?: string } | undefined)?.message;
      if (err.response?.status === 429) return t("recoveryRateLimited");
      if (message && (KNOWN_ERRORS as readonly string[]).includes(message)) {
        return t(message as (typeof KNOWN_ERRORS)[number]);
      }
      if (message) return message;
    }

    return t("unknownError");
  }

  async function call<T>(path: string, data: Record<string, unknown> = {}, tokenToUse = token) {
    const res = await axios.post<T>(`${getAPIUrl()}${path}`, data, {
      withCredentials: false,
      headers: {
        "Content-Type": "application/json",
        "x-recovery-token": tokenToUse ?? "",
      },
    });

    return res.data;
  }

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading("unlock");

    try {
      const trimmed = tokenInput.trim();
      const data = await call<RecoveryStatus>("/recovery/verify", {}, trimmed);
      setToken(trimmed);
      setTokenInput("");
      setStatus(data);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(null);
    }
  }

  function lock() {
    setToken(null);
    setStatus(null);
    setUsers(null);
    setSelectedUser(null);
    setSuccess(null);
    setError(null);
  }

  async function searchUsers(event?: React.FormEvent) {
    event?.preventDefault();
    setError(null);
    setLoading("search");

    try {
      const data = await call<RecoveryUser[]>("/recovery/users", { query: query || null });
      setUsers(data);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(null);
    }
  }

  async function runCadAction(key: CadActionKey, path: string) {
    setError(null);
    setSuccess(null);
    setLoading(key);

    try {
      const data = await call<RecoveryStatus>(path);
      setStatus(data);
      setSuccess(`${t(`action_${key}`)}: ${t("actionSuccess")}`);
      return true;
    } catch (err) {
      setError(parseError(err));
      return false;
    } finally {
      setLoading(null);
    }
  }

  async function runUserAction(key: UserActionKey, path: string, extra: Record<string, unknown>) {
    if (!selectedUser) return false;
    setError(null);
    setSuccess(null);
    setLoading(key);

    try {
      const updated = await call<RecoveryUser>(path, { userId: selectedUser.id, ...extra });
      setSelectedUser(updated);
      setUsers((prev) => prev?.map((u) => (u.id === updated.id ? updated : u)) ?? prev);
      setSuccess(`${t(`action_${key}`)} (${updated.username}): ${t("actionSuccess")}`);
      return true;
    } catch (err) {
      setError(parseError(err));
      return false;
    } finally {
      setLoading(null);
    }
  }

  const sortedFeatures = status ? Object.entries(status.features) : [];

  return (
    <>
      <Title renderLayoutTitle={false}>{t("recoveryTools")}</Title>

      <main className="min-h-screen flex flex-col items-center px-4 py-10 sm:py-16">
        {token && status ? (
          <div className="w-full max-w-5xl flex flex-col gap-6">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-lg shadow-md bg-gray-100 dark:bg-primary dark:border dark:border-secondary">
              <div className="flex items-center gap-4">
                <span className="grid place-items-center w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <ShieldCheck width={24} height={24} aria-hidden />
                </span>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                    {t("recoveryTools")}
                  </h1>
                  <p className="text-sm text-neutral-600 dark:text-gray-400">
                    {status.cadName ? `${status.cadName} · ` : null}
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {t("unlocked")}
                    </span>
                  </p>
                </div>
              </div>
              <Button onPress={lock} className="flex items-center gap-2 self-start sm:self-auto">
                <LockFill aria-hidden /> {t("lock")}
              </Button>
            </header>

            <StatusMessages error={error} success={success} />

            <Section icon={<Sliders aria-hidden />} title={t("currentSettings")}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {sortedFeatures.map(([feature, isEnabled]) => (
                  <StatusPill key={feature} label={feature} isEnabled={isEnabled} />
                ))}
                <StatusPill label={t("whitelist")} isEnabled={status.whitelisted} />
              </div>
            </Section>

            <Section icon={<Gear aria-hidden />} title={t("cadActions")}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {CAD_ACTIONS.map((action) => (
                  <ActionCard
                    key={action.key}
                    icon={ACTION_ICONS[action.key]}
                    title={t(`action_${action.key}`)}
                    description={t(`action_${action.key}_description`)}
                    isLoading={loading === action.key}
                    onConfirm={() => runCadAction(action.key, action.path)}
                  />
                ))}
              </div>
            </Section>

            <Section icon={<PeopleFill aria-hidden />} title={t("userActions")}>
              <form
                onSubmit={searchUsers}
                className="flex flex-col sm:flex-row sm:items-start gap-2"
              >
                <TextField
                  className="w-full"
                  label={t("searchUsers")}
                  description={t("searchUsersHelp")}
                  value={query}
                  onChange={setQuery}
                />
                <Button
                  type="submit"
                  variant="blue"
                  className="sm:mt-6 flex items-center justify-center gap-2 shrink-0"
                  isDisabled={loading === "search"}
                >
                  {loading === "search" ? <Loader /> : <Search aria-hidden />}
                  {t("search")}
                </Button>
              </form>

              {users ? (
                users.length <= 0 ? (
                  <p className="mt-4 text-neutral-600 dark:text-gray-400">{t("noUsersFound")}</p>
                ) : (
                  <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {users.map((user) => (
                      <li key={user.id}>
                        <UserCard
                          user={user}
                          isSelected={selectedUser?.id === user.id}
                          onSelect={() => {
                            setSelectedUser(user);
                            setSuccess(null);
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                )
              ) : null}

              <div className="mt-6 pt-5 border-t border-gray-300 dark:border-secondary">
                {selectedUser ? (
                  <>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <PersonFill aria-hidden />
                      {t("selectedUser", { username: selectedUser.username })}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {USER_ACTIONS.map((action) => (
                        <ActionCard
                          key={`${selectedUser.id}-${action.key}`}
                          icon={ACTION_ICONS[action.key]}
                          title={t(`action_${action.key}`)}
                          description={t(`action_${action.key}_description`)}
                          isLoading={loading === action.key}
                          danger={action.danger}
                          requiresPassword={action.key === "resetPassword"}
                          onConfirm={(extra) => runUserAction(action.key, action.path, extra)}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-center py-6 text-neutral-600 dark:text-gray-400">
                    {t("selectUserFirst")}
                  </p>
                )}
              </div>
            </Section>

            <DatabaseSettingsGuide />
            <BackToLogin />
          </div>
        ) : (
          <div className="w-full max-w-md flex flex-col gap-4">
            <form
              onSubmit={unlock}
              className="w-full p-6 rounded-lg shadow-md bg-gray-100 dark:bg-primary dark:border dark:border-secondary"
            >
              <div className="flex flex-col items-center text-center mb-6">
                <span className="grid place-items-center w-14 h-14 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 mb-3">
                  <ShieldLockFill width={28} height={28} aria-hidden />
                </span>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                  {t("recoveryTools")}
                </h1>
                <p className="mt-2 text-sm text-neutral-600 dark:text-gray-400">
                  {t("recoveryIntro")}
                </p>
              </div>

              <StatusMessages error={error} success={success} />

              <div className="relative [&_input]:pr-10 [&_input]:font-mono">
                <TextField
                  type={showToken ? "text" : "password"}
                  autoComplete="off"
                  autoFocus
                  label={t("recoveryToken")}
                  value={tokenInput}
                  onChange={setTokenInput}
                />
                <button
                  type="button"
                  aria-label={showToken ? t("hideToken") : t("showToken")}
                  title={showToken ? t("hideToken") : t("showToken")}
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute right-2 top-[34px] p-1.5 rounded-md text-neutral-500 hover:text-neutral-800 dark:text-gray-400 dark:hover:text-white"
                >
                  {showToken ? <EyeSlash aria-hidden /> : <Eye aria-hidden />}
                </button>
              </div>

              <Button
                type="submit"
                variant="blue"
                className="w-full mt-3 flex items-center justify-center gap-2"
                isDisabled={!tokenInput.trim() || loading === "unlock"}
              >
                {loading === "unlock" ? <Loader /> : <UnlockFill aria-hidden />}
                {t("unlock")}
              </Button>

              <p className="mt-4 text-xs text-neutral-500 dark:text-gray-500">
                {t("recoveryTokenHelp")}
              </p>
            </form>

            <DatabaseSettingsGuide />
            <BackToLogin />
          </div>
        )}
      </main>
    </>
  );
}

const ACTION_ICONS: Record<CadActionKey | UserActionKey, React.ReactNode> = {
  enableRegularLogin: <KeyFill aria-hidden />,
  disableForcedOAuth: <Discord aria-hidden />,
  disableWhitelist: <ListCheck aria-hidden />,
  resetPassword: <Key aria-hidden />,
  disable2FA: <PhoneFill aria-hidden />,
  unlinkDiscord: <Discord aria-hidden />,
  unlinkSteam: <Steam aria-hidden />,
  restoreUserAccess: <PersonCheckFill aria-hidden />,
  makeOwner: <StarFill aria-hidden />,
};

function BackToLogin() {
  const t = useTranslations("Recovery");

  return (
    <Link
      href="/auth/login"
      className="flex items-center gap-2 self-center text-sm underline text-neutral-600 hover:text-neutral-900 dark:text-gray-400 dark:hover:text-white"
    >
      <ArrowLeft aria-hidden /> {t("backToLogin")}
    </Link>
  );
}

function StatusMessages({ error, success }: { error: string | null; success: string | null }) {
  if (!error && !success) return null;

  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-2 mb-3">
      {error ? <Alert type="error" message={error} /> : null}
      {success ? <Alert type="success" message={success} /> : null}
    </div>
  );
}

function StatusPill({ label, isEnabled }: { label: string; isEnabled: boolean }) {
  const t = useTranslations("Recovery");

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-white dark:bg-tertiary border border-gray-200 dark:border-secondary">
      <code className="text-xs sm:text-sm break-all">{label}</code>
      <span
        className={classNames(
          "flex items-center gap-1.5 shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full",
          isEnabled
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            : "bg-gray-400/20 text-gray-600 dark:text-gray-400",
        )}
      >
        <span
          className={classNames(
            "w-1.5 h-1.5 rounded-full",
            isEnabled ? "bg-emerald-500" : "bg-gray-400",
          )}
        />
        {isEnabled ? t("enabled") : t("disabled")}
      </span>
    </div>
  );
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "red" | "green" | "blue";
}) {
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
        tone === "neutral" && "bg-gray-400/20 text-gray-700 dark:text-gray-300",
        tone === "red" && "bg-red-500/15 text-red-700 dark:text-red-400",
        tone === "green" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        tone === "blue" && "bg-blue-500/15 text-blue-700 dark:text-blue-400",
      )}
    >
      {children}
    </span>
  );
}

function UserCard({
  user,
  isSelected,
  onSelect,
}: {
  user: RecoveryUser;
  isSelected: boolean;
  onSelect(): void;
}) {
  const t = useTranslations("Recovery");

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={classNames(
        "w-full text-left flex items-center gap-3 p-3 rounded-md border transition-colors",
        isSelected
          ? "border-blue-500 bg-blue-500/10"
          : "border-gray-200 dark:border-secondary bg-white dark:bg-tertiary hover:border-gray-400 dark:hover:border-gray-500",
      )}
    >
      <span className="grid place-items-center w-10 h-10 rounded-full bg-gray-300 dark:bg-secondary font-bold uppercase shrink-0">
        {user.username.charAt(0)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-semibold truncate">{user.username}</span>
          {isSelected ? <CheckCircleFill className="text-blue-500 shrink-0" aria-hidden /> : null}
        </span>
        <span className="mt-1 flex flex-wrap gap-1">
          <Badge tone={user.rank === "OWNER" ? "blue" : "neutral"}>{user.rank}</Badge>
          {user.banned ? (
            <Badge tone="red">{t("banned")}</Badge>
          ) : (
            <Badge tone={user.whitelistStatus === "ACCEPTED" ? "green" : "red"}>
              {user.whitelistStatus}
            </Badge>
          )}
          {user.has2FA ? <Badge>{t("twoFactor")}</Badge> : null}
          {user.discordId ? (
            <Badge>
              <Discord aria-hidden /> {t("discord")}
            </Badge>
          ) : null}
          {user.steamId ? (
            <Badge>
              <Steam aria-hidden /> {t("steam")}
            </Badge>
          ) : null}
        </span>
      </span>
    </button>
  );
}

function Section({
  title,
  icon,
  right,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="p-5 rounded-lg shadow-md bg-gray-100 dark:bg-primary dark:border dark:border-secondary">
      <header className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800 dark:text-white">
          {icon ? <span className="text-neutral-500 dark:text-gray-400">{icon}</span> : null}
          {title}
        </h2>
        {right}
      </header>
      {children}
    </section>
  );
}

function ActionCard({
  icon,
  title,
  description,
  isLoading,
  danger,
  requiresPassword,
  onConfirm,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  isLoading: boolean;
  danger?: boolean;
  requiresPassword?: boolean;
  onConfirm(extra: Record<string, unknown>): Promise<boolean>;
}) {
  const t = useTranslations("Recovery");
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState("");

  const isPasswordValid = !requiresPassword || newPassword.length >= 8;

  async function handleConfirm() {
    const ok = await onConfirm(requiresPassword ? { newPassword } : {});
    if (ok) {
      setIsConfirming(false);
      setNewPassword("");
    }
  }

  return (
    <div
      className={classNames(
        "flex flex-col p-4 rounded-md border bg-white dark:bg-tertiary",
        danger ? "border-red-500/60" : "border-gray-200 dark:border-secondary",
      )}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <span
            className={classNames(
              "grid place-items-center w-9 h-9 rounded-md shrink-0",
              danger
                ? "bg-red-500/15 text-red-600 dark:text-red-400"
                : "bg-blue-500/15 text-blue-600 dark:text-blue-400",
            )}
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-800 dark:text-white">{title}</h3>
          <p className="text-sm text-neutral-600 dark:text-gray-400 mt-1">{description}</p>
        </div>
      </div>

      {isConfirming ? (
        <div className="mt-4 p-3 rounded-md bg-amber-500/10 border border-amber-500/50">
          <p className="font-semibold mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <ExclamationTriangleFill aria-hidden /> {t("confirmTitle")}
          </p>
          {requiresPassword ? (
            <TextField
              type="password"
              autoComplete="new-password"
              label={t("newPassword")}
              description={t("newPasswordHelp")}
              value={newPassword}
              onChange={setNewPassword}
            />
          ) : null}
          <div className="flex flex-wrap gap-2 mt-2">
            <Button
              size="xs"
              variant="danger"
              className="flex items-center gap-2"
              isDisabled={isLoading || !isPasswordValid}
              onPress={handleConfirm}
            >
              {isLoading ? <Loader /> : null}
              {t("confirm")}
            </Button>
            <Button
              size="xs"
              variant="cancel"
              onPress={() => {
                setIsConfirming(false);
                setNewPassword("");
              }}
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="xs"
          variant={danger ? "danger" : "default"}
          className="mt-4 self-start"
          onPress={() => setIsConfirming(true)}
        >
          {t("run")}
        </Button>
      )}
    </div>
  );
}

const DB_ROWS = [
  { key: "dbName", variable: "DB_NAME", example: "snaily-cad-v4" },
  { key: "dbUser", variable: "DB_USER", example: "snailycad" },
  { key: "dbPassword", variable: "DB_PASSWORD", example: "<your password>" },
  {
    key: "dbHost",
    variable: "DB_HOST",
    example: "localhost",
  },
  { key: "dbPort", variable: "DB_PORT", example: "3306" },
] as const;

function DatabaseSettingsGuide() {
  const t = useTranslations("Recovery");

  return (
    <details className="group rounded-lg shadow-md bg-gray-100 dark:bg-primary dark:border dark:border-secondary">
      <summary className="flex items-center justify-between gap-2 p-5 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white">
          <span className="text-neutral-500 dark:text-gray-400">
            <Database aria-hidden />
          </span>
          {t("databaseSettings")}
        </span>
        <ChevronDown className="transition-transform group-open:rotate-180" aria-hidden />
      </summary>

      <div className="px-5 pb-5">
        <p className="text-sm text-neutral-600 dark:text-gray-400 mb-3">
          {t("databaseSettingsIntro")}
        </p>

        <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-secondary">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-200 dark:bg-secondary">
              <tr>
                <th className="px-3 py-2">{t("parameter")}</th>
                <th className="px-3 py-2">{t("variables")}</th>
                <th className="px-3 py-2">{t("example")}</th>
              </tr>
            </thead>
            <tbody>
              {DB_ROWS.map((row) => (
                <tr key={row.key} className="border-t border-gray-200 dark:border-secondary">
                  <td className="px-3 py-2">{t(row.key)}</td>
                  <td className="px-3 py-2">
                    <code>DATABASE_URL</code> / <code>{row.variable}</code>
                  </td>
                  <td className="px-3 py-2">
                    <code>{row.example}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-sm mt-3">{t("databaseUrlInfo")}</p>

        <pre className="mt-3 p-3 rounded-md bg-gray-200 dark:bg-tertiary text-sm overflow-x-auto">
          {
            "mysql -u snailycad -p -h localhost -P 3306 snaily-cad-v4\n# MariaDB: mariadb -u snailycad -p -h localhost -P 3306 snaily-cad-v4"
          }
        </pre>

        <h3 className="text-base font-semibold mt-5 mb-2">{t("manageToken")}</h3>
        <ul className="list-disc pl-5 text-sm flex flex-col gap-1">
          <li>{t("manageToken_locate")}</li>
          <li>{t("manageToken_rotate")}</li>
          <li>{t("manageToken_replace")}</li>
        </ul>
        <p className="text-sm mt-3 italic text-neutral-600 dark:text-gray-400">{t("fullGuide")}</p>
      </div>
    </details>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  // fall back to the English strings for locales without a recovery.json yet
  const [englishMessages, localeMessages] = await Promise.all([
    getTranslations(["recovery"], "en"),
    getTranslations(["recovery"], locale),
  ]);

  return {
    props: {
      session: null,
      messages: { ...englishMessages, ...localeMessages },
    },
  };
};
