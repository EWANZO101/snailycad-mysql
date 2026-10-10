import * as React from "react";
import { Button, FullDate, Loader, TabsContent, TextField } from "@snailycad/ui";
import { useTranslations } from "next-intl";
import { Select } from "components/form/Select";
import { Table, useTableState } from "components/shared/Table";
import useFetch from "lib/useFetch";
import { makeUnitName } from "lib/utils";
import { useGenerateCallsign } from "hooks/useGenerateCallsign";

const DRUG_TEST_RESULTS = ["POSITIVE", "NEGATIVE", "INCONCLUSIVE"] as const;
type DrugTestResult = (typeof DRUG_TEST_RESULTS)[number];

interface CitizenDrugTest {
  id: string;
  citizenId: string;
  officerId: string | null;
  officer?: any | null;
  substances: string;
  result: DrugTestResult;
  notes: string | null;
  createdAt: Date | string;
}

interface Props {
  citizenId: string;
}

/** drug tests of a citizen, only rendered for users with the `Leo` permission */
export function DrugTestsTab({ citizenId }: Props) {
  const t = useTranslations("Leo");
  const common = useTranslations("Common");
  const { state, execute } = useFetch();
  const tableState = useTableState();
  const { generateCallsign } = useGenerateCallsign();

  const [drugTests, setDrugTests] = React.useState<CitizenDrugTest[]>([]);
  const [isFormOpen, setFormOpen] = React.useState(false);
  const [substances, setSubstances] = React.useState("");
  const [result, setResult] = React.useState<DrugTestResult>("NEGATIVE");
  const [notes, setNotes] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({});

  React.useEffect(() => {
    let isMounted = true;

    execute<CitizenDrugTest[]>({
      path: `/leo/drug-tests/${citizenId}`,
      method: "GET",
      noToast: true,
    }).then(({ json }) => {
      if (isMounted && Array.isArray(json)) {
        setDrugTests(json);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [citizenId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});

    const { json } = await execute<CitizenDrugTest>({
      path: "/leo/drug-tests",
      method: "POST",
      data: { citizenId, substances, result, notes: notes || null },
      helpers: {
        setFieldError: (field: string, message: string | undefined) =>
          setErrors((prev) => ({ ...prev, [field]: message })),
      } as any,
    });

    if (json?.id) {
      setDrugTests((prev) => [json, ...prev]);
      setSubstances("");
      setResult("NEGATIVE");
      setNotes("");
      setFormOpen(false);
    }
  }

  function officerName(officer: CitizenDrugTest["officer"]) {
    if (!officer) return common("none");
    return `${generateCallsign(officer)} ${makeUnitName(officer)}`;
  }

  return (
    <TabsContent value="drugTests">
      <header className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">{t("drugTests")}</h3>
        <Button type="button" size="xs" onPress={() => setFormOpen((v) => !v)}>
          {isFormOpen ? common("cancel") : t("addDrugTest")}
        </Button>
      </header>

      {isFormOpen ? (
        <form onSubmit={handleSubmit} className="card p-3 my-3 flex flex-col gap-2">
          <TextField
            label={t("drugTestSubstances")}
            placeholder={t("drugTestSubstancesDescription")}
            name="substances"
            value={substances}
            errorMessage={errors.substances}
            onChange={(value) => setSubstances(value)}
          />

          <div>
            <p className="mb-1 text-neutral-800 dark:text-gray-300">{t("drugTestResult")}</p>
            <Select
              name="result"
              value={result}
              errorMessage={errors.result}
              onChange={(event) => setResult(event.target.value as DrugTestResult)}
              values={DRUG_TEST_RESULTS.map((value) => ({
                label: t(`drugTestResult_${value}`),
                value,
              }))}
            />
          </div>

          <TextField
            isTextarea
            isOptional
            label={t("drugTestNotes")}
            name="notes"
            value={notes}
            errorMessage={errors.notes}
            onChange={(value) => setNotes(value)}
          />

          <footer className="flex justify-end">
            <Button
              type="submit"
              className="flex items-center gap-2"
              disabled={state === "loading" || !substances.trim()}
            >
              {state === "loading" ? <Loader /> : null}
              {common("save")}
            </Button>
          </footer>
        </form>
      ) : null}

      {drugTests.length <= 0 ? (
        <p className="text-neutral-700 dark:text-gray-400 my-2">{t("noDrugTests")}</p>
      ) : (
        <Table
          tableState={tableState}
          data={drugTests.map((drugTest) => ({
            id: drugTest.id,
            substances: drugTest.substances,
            result: (
              <span
                className={
                  drugTest.result === "POSITIVE"
                    ? "text-red-500 font-semibold"
                    : drugTest.result === "NEGATIVE"
                      ? "text-green-500 font-semibold"
                      : "text-amber-500 font-semibold"
                }
              >
                {t(`drugTestResult_${drugTest.result}`)}
              </span>
            ),
            notes: drugTest.notes || common("none"),
            officer: officerName(drugTest.officer),
            createdAt: <FullDate>{drugTest.createdAt}</FullDate>,
          }))}
          columns={[
            { header: t("drugTestSubstances"), accessorKey: "substances" },
            { header: t("drugTestResult"), accessorKey: "result" },
            { header: t("drugTestNotes"), accessorKey: "notes" },
            { header: t("officer"), accessorKey: "officer" },
            { header: common("createdAt"), accessorKey: "createdAt" },
          ]}
        />
      )}
    </TabsContent>
  );
}
