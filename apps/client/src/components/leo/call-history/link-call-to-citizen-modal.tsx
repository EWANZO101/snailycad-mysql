import * as React from "react";
import { LINK_INCIDENT_TO_CALL_SCHEMA } from "@snailycad/schemas";
import { Loader, Button } from "@snailycad/ui";
import { FormField } from "components/form/FormField";
import { Select, type SelectValue } from "components/form/Select";
import { Modal } from "components/modal/Modal";
import { useModal } from "state/modalState";
import { Form, Formik } from "formik";
import { handleValidate } from "lib/handleValidate";
import useFetch from "lib/useFetch";
import { useTranslations } from "next-intl";
import type { Full911Call } from "state/dispatch/dispatch-state";
import { ModalIds } from "types/modal-ids";
import type { EmsFdIncident, LeoIncident } from "@snailycad/types";
import type { GetIncidentsData, PostLink911CallToIncident } from "@snailycad/types/api";
import { slateDataToString } from "@snailycad/utils/editor";
import { useDebounce } from "react-use";

interface Props {
  call: Full911Call | null;
  onSave(call: Full911Call): void;
  incidents: LeoIncident[];
  emsFdIncidents?: EmsFdIncident[];
  /** whether the user can view/link LEO incidents */
  showLeoIncidents?: boolean;
  /** whether the user can view/link EMS/FD incidents */
  showEmsFdIncidents?: boolean;
}

export function LinkCallToIncidentModal({
  incidents,
  emsFdIncidents = [],
  showLeoIncidents = true,
  showEmsFdIncidents = false,
  onSave,
  call,
}: Props) {
  const common = useTranslations("Common");
  const t = useTranslations("Leo");
  const nav = useTranslations("Nav");
  const modalState = useModal();
  const { state, execute } = useFetch();

  async function onSubmit(values: typeof INITIAL_VALUES) {
    if (!call) return;

    const { json } = await execute<PostLink911CallToIncident>({
      path: `/911-calls/link-incident/${call.id}`,
      method: "POST",
      data: {
        incidentIds: showLeoIncidents ? values.incidentIds.map((v) => v.value) : undefined,
        emsFdIncidentId: showEmsFdIncidents ? (values.emsFdIncidentId ?? null) : undefined,
      },
    });

    if (json) {
      modalState.closeModal(ModalIds.LinkCallToIncident);
      onSave({ ...call, ...json });
    }
  }

  const validate = handleValidate(LINK_INCIDENT_TO_CALL_SCHEMA);
  const callIncidents = call?.incidents?.map((v) => ({ value: v.id, label: `#${v.caseNumber}` }));
  const INITIAL_VALUES = {
    incidentIds: (callIncidents ?? []) as SelectValue[],
    emsFdIncidentId: (call?.emsFdIncidentId ?? null) as string | null,
  };

  const leoSearch = useIncidentSearch({
    path: "/incidents",
    enabled: showLeoIncidents,
    initialIncidents: incidents,
  });
  const emsFdSearch = useIncidentSearch({
    path: "/ems-fd/incidents",
    enabled: showEmsFdIncidents,
    initialIncidents: emsFdIncidents,
    extraIncidents: call?.EmsFdIncident ? [call.EmsFdIncident] : [],
  });

  return (
    <Modal
      title={t("linkToIncident")}
      isOpen={modalState.isOpen(ModalIds.LinkCallToIncident)}
      onClose={() => modalState.closeModal(ModalIds.LinkCallToIncident)}
      className="min-w-[600px]"
    >
      <Formik validate={validate} onSubmit={onSubmit} initialValues={INITIAL_VALUES}>
        {({ handleChange, errors, values }) => (
          <Form>
            {showLeoIncidents ? (
              <FormField errorMessage={errors.incidentIds as string} label={t("caseNumber")}>
                <Select
                  closeMenuOnSelect={false}
                  isMulti
                  values={leoSearch.options}
                  value={values.incidentIds}
                  onChange={handleChange}
                  name="incidentIds"
                  {...leoSearch.selectProps}
                  loadingMessage={() => common("searching")}
                />
              </FormField>
            ) : null}

            {showEmsFdIncidents ? (
              <FormField
                errorMessage={errors.emsFdIncidentId as string}
                label={`${t("caseNumber")} (${nav("emsFdIncidents")})`}
              >
                <Select
                  isClearable
                  values={emsFdSearch.getOptions(values.emsFdIncidentId)}
                  value={values.emsFdIncidentId}
                  onChange={handleChange}
                  name="emsFdIncidentId"
                  {...emsFdSearch.selectProps}
                  loadingMessage={() => common("searching")}
                />
              </FormField>
            ) : null}

            <footer className="flex items-center justify-end gap-2 mt-5">
              <Button
                type="reset"
                onPress={() => modalState.closeModal(ModalIds.LinkCallToIncident)}
                variant="cancel"
              >
                {common("cancel")}
              </Button>
              <Button className="flex items-center" disabled={state === "loading"} type="submit">
                {state === "loading" ? <Loader className="mr-2" /> : null}
                {common("save")}
              </Button>
            </footer>
          </Form>
        )}
      </Formik>
    </Modal>
  );
}

type SearchableIncident = Pick<
  LeoIncident | EmsFdIncident,
  "id" | "caseNumber" | "description" | "descriptionData"
>;

interface UseIncidentSearchOptions<T extends SearchableIncident> {
  path: "/incidents" | "/ems-fd/incidents";
  enabled: boolean;
  /** the incidents fetched on the server (first page) */
  initialIncidents: T[];
  /** incidents that must always be selectable (e.g. the currently linked incident) */
  extraIncidents?: T[];
}

const INCIDENT_DESCRIPTION_MAX_LENGTH = 60;

function makeIncidentOption(incident: SearchableIncident): SelectValue {
  const description = (
    incident.description ||
    slateDataToString(incident.descriptionData as any) ||
    ""
  ).trim();

  return {
    value: incident.id,
    label: `#${incident.caseNumber}`,
    description:
      description.length > INCIDENT_DESCRIPTION_MAX_LENGTH
        ? `${description.slice(0, INCIDENT_DESCRIPTION_MAX_LENGTH)}...`
        : description || null,
  };
}

/**
 * search-as-you-type for incidents. Searches the API (`?query=`) so incidents beyond the
 * first page (25) can be found. While the API request is pending, the already loaded
 * incidents are filtered client-side as quick suggestions.
 */
function useIncidentSearch<T extends SearchableIncident>(options: UseIncidentSearchOptions<T>) {
  const { execute, state } = useFetch();
  const [inputValue, setInputValue] = React.useState("");
  const [results, setResults] = React.useState<{ query: string; incidents: T[] } | null>(null);
  const latestQueryRef = React.useRef("");
  /** keeps track of every incident we've seen, so selected values can always be resolved */
  const seenIncidentsRef = React.useRef(new Map<string, T>());

  for (const incident of [...options.initialIncidents, ...(options.extraIncidents ?? [])]) {
    seenIncidentsRef.current.set(incident.id, incident);
  }

  useDebounce(
    async () => {
      const query = inputValue.trim();
      latestQueryRef.current = query;

      if (!options.enabled || !query) {
        setResults(null);
        return;
      }

      const { json } = await execute<GetIncidentsData<"leo"> | GetIncidentsData<"ems-fd">>({
        path: options.path,
        params: { activeType: "all", query },
        noToast: true,
      });

      // ignore out-of-order responses
      if (latestQueryRef.current !== query) return;

      const incidents = (json?.incidents ?? []) as unknown as T[];
      for (const incident of incidents) {
        seenIncidentsRef.current.set(incident.id, incident);
      }

      setResults({ query, incidents });
    },
    300,
    [inputValue, options.enabled],
  );

  const isServerFiltered = !!results && results.query === inputValue.trim();
  const incidents = React.useMemo(() => {
    const map = new Map<string, T>();
    for (const incident of [
      ...(results?.incidents ?? []),
      ...(isServerFiltered ? [] : options.initialIncidents),
      ...(options.extraIncidents ?? []),
    ]) {
      map.set(incident.id, incident);
    }

    return Array.from(map.values());
  }, [results, isServerFiltered, options.initialIncidents, options.extraIncidents]);

  const optionValues = incidents.map(makeIncidentOption);

  /** makes sure the currently selected value (single select) is part of the options */
  function getOptions(selectedId?: string | null) {
    if (!selectedId || optionValues.some((v) => v.value === selectedId)) {
      return optionValues;
    }

    const seen = seenIncidentsRef.current.get(selectedId);
    return seen ? [...optionValues, makeIncidentOption(seen)] : optionValues;
  }

  return {
    options: optionValues,
    getOptions,
    selectProps: {
      inputValue,
      onInputChange: (value: string, meta: { action: string }) => {
        // "set-value" is ignored so the typed text is kept when selecting an option (multi select)
        if (meta.action === "input-change") {
          setInputValue(value);
        } else if (meta.action === "menu-close" || meta.action === "input-blur") {
          setInputValue("");
        }
      },
      isLoading: state === "loading",
      // the API already filtered the results (including description matches)
      filterOption: isServerFiltered ? null : undefined,
      formatOptionLabel: (option: unknown, meta: { context: "menu" | "value" }) => {
        const { label, description } = option as SelectValue;
        return meta.context === "menu" && description ? `${label} - ${description}` : label;
      },
    },
  };
}
