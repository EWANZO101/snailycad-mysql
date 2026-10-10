import * as React from "react";
import { useTranslations } from "use-intl";
import { useDebounce } from "react-use";
import { Button, FullDate, Loader, Status, TextField } from "@snailycad/ui";
import type { WhitelistStatus } from "@snailycad/types";
import { Modal } from "components/modal/Modal";
import { useModal } from "state/modalState";
import { ModalIds } from "types/modal-ids";
import useFetch from "lib/useFetch";

interface ClaimableCitizen {
  id: string;
  name: string;
  surname: string;
  dateOfBirth: Date | string;
  hasPendingClaim?: boolean;
}

interface CitizenClaim {
  id: string;
  status: WhitelistStatus;
  reason: string | null;
  createdAt: Date | string;
  reviewedAt: Date | string | null;
  citizen: ClaimableCitizen;
}

export function ClaimCitizenModal() {
  const modalState = useModal();
  const isOpen = modalState.isOpen(ModalIds.ClaimCitizen);
  const t = useTranslations("CitizenClaims");
  const common = useTranslations("Common");

  const [query, setQuery] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [results, setResults] = React.useState<ClaimableCitizen[] | null>(null);
  const [claims, setClaims] = React.useState<CitizenClaim[]>([]);
  const [submittingId, setSubmittingId] = React.useState<string | null>(null);

  const { state: searchState, execute: executeSearch } = useFetch();
  const { execute } = useFetch();

  const fetchClaims = React.useCallback(async () => {
    const { json } = await execute<CitizenClaim[]>({ path: "/citizen-claims", noToast: true });
    if (Array.isArray(json)) {
      setClaims(json);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (isOpen) {
      fetchClaims();
    }
  }, [isOpen, fetchClaims]);

  useDebounce(
    async () => {
      if (query.trim().length < 2) {
        setResults(null);
        return;
      }

      const { json } = await executeSearch<ClaimableCitizen[]>({
        path: "/citizen-claims/search",
        params: { query: query.trim() },
        noToast: true,
      });

      if (Array.isArray(json)) {
        setResults(json);
      }
    },
    400,
    [query],
  );

  async function handleClaim(citizen: ClaimableCitizen) {
    setSubmittingId(citizen.id);
    const { json } = await execute<CitizenClaim>({
      path: "/citizen-claims",
      method: "POST",
      data: { citizenId: citizen.id, reason: reason.trim() || null },
    });
    setSubmittingId(null);

    if (json?.id) {
      setReason("");
      setClaims((prev) => [json, ...prev]);
      setResults((prev) =>
        prev ? prev.map((v) => (v.id === citizen.id ? { ...v, hasPendingClaim: true } : v)) : prev,
      );
    }
  }

  async function handleCancel(claim: CitizenClaim) {
    const { json } = await execute<boolean>({
      path: `/citizen-claims/${claim.id}`,
      method: "DELETE",
    });

    if (json) {
      setClaims((prev) => prev.filter((v) => v.id !== claim.id));
      setResults((prev) =>
        prev
          ? prev.map((v) => (v.id === claim.citizen.id ? { ...v, hasPendingClaim: false } : v))
          : prev,
      );
    }
  }

  return (
    <Modal
      className="w-[700px]"
      title={t("claimCitizen")}
      onClose={() => modalState.closeModal(ModalIds.ClaimCitizen)}
      isOpen={isOpen}
    >
      <p className="mb-3 text-neutral-700 dark:text-gray-400">{t("claimCitizenInfo")}</p>

      <TextField
        label={common("search")}
        className="relative w-full"
        name="claim-citizen-search"
        value={query}
        onChange={setQuery}
        placeholder={t("searchPlaceholder")}
        autoFocus
      >
        {searchState === "loading" ? (
          <span className="absolute top-[2.4rem] right-2.5">
            <Loader />
          </span>
        ) : null}
      </TextField>

      <TextField
        isTextarea
        isOptional
        label={t("reason")}
        name="claim-citizen-reason"
        value={reason}
        onChange={setReason}
        placeholder={t("reasonPlaceholder")}
      />

      {results ? (
        results.length <= 0 ? (
          <p className="my-3 text-neutral-700 dark:text-gray-400">{t("noClaimableCitizens")}</p>
        ) : (
          <ul className="my-3 flex flex-col gap-2 max-h-72 overflow-y-auto thin-scrollbar">
            {results.map((citizen) => (
              <li
                key={citizen.id}
                className="flex items-center justify-between gap-2 rounded-md border border-gray-300 px-3 py-2 dark:border-quinary"
              >
                <div>
                  <p className="font-semibold">
                    {citizen.name} {citizen.surname}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    <FullDate isDateOfBirth onlyDate>
                      {citizen.dateOfBirth}
                    </FullDate>
                  </p>
                </div>

                {citizen.hasPendingClaim ? (
                  <Status>PENDING</Status>
                ) : (
                  <Button
                    size="xs"
                    isDisabled={submittingId === citizen.id}
                    onPress={() => handleClaim(citizen)}
                  >
                    {t("requestClaim")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )
      ) : null}

      <h3 className="mt-5 mb-2 text-xl font-semibold">{t("myClaims")}</h3>
      {claims.length <= 0 ? (
        <p className="text-neutral-700 dark:text-gray-400">{t("noClaims")}</p>
      ) : (
        <ul className="flex flex-col gap-2 max-h-60 overflow-y-auto thin-scrollbar">
          {claims.map((claim) => (
            <li
              key={claim.id}
              className="flex items-center justify-between gap-2 rounded-md border border-gray-300 px-3 py-2 dark:border-quinary"
            >
              <div>
                <p className="font-semibold">
                  {claim.citizen.name} {claim.citizen.surname}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {t("requestedAt")}: <FullDate>{claim.createdAt}</FullDate>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Status>{claim.status}</Status>
                {claim.status === "PENDING" ? (
                  <Button size="xs" variant="danger" onPress={() => handleCancel(claim)}>
                    {t("cancelClaim")}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <footer className="flex justify-end mt-5">
        <Button onPress={() => modalState.closeModal(ModalIds.ClaimCitizen)}>
          {common("ok")}
        </Button>
      </footer>
    </Modal>
  );
}
