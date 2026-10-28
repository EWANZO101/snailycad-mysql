import * as React from "react";
import { Form, Formik } from "formik";
import { useTranslations } from "use-intl";
import { useAuth } from "context/AuthContext";
import useFetch from "lib/useFetch";
import {
  type CadFeature,
  type CadFeatureOptions,
  CourthouseType,
  Feature,
  LicenseExamType,
} from "@snailycad/types";
import { Button, Loader, TextField, SelectField, SwitchField } from "@snailycad/ui";
import { toastMessage } from "lib/toastMessage";
import { DEFAULT_DISABLED_FEATURES, DEFAULT_FEATURE_OPTIONS } from "hooks/useFeatureEnabled";
import type { PutCADFeaturesData } from "@snailycad/types/api";
import Link from "next/link";
import { BoxArrowUpRight, ToggleOn } from "react-bootstrap-icons";
import { TabsContent } from "@radix-ui/react-tabs";
import { SettingsTabs } from "components/admin/cad-settings/layout";
import { SettingsTabHeader } from "components/admin/cad-settings/settings-tab-header";
import { classNames } from "lib/classNames";

const featuresWithURL: string[] = [
  Feature.BLEETER,
  Feature.DISCORD_AUTH,
  Feature.STEAM_OAUTH,
  Feature.FORCE_DISCORD_AUTH,
  Feature.FORCE_STEAM_AUTH,
  Feature.DMV,
  Feature.BUREAU_OF_FIREARMS,
  Feature.COURTHOUSE,
  Feature.COURTHOUSE_POSTS,
  Feature.TONES,
  Feature.ACTIVE_WARRANTS,
  Feature.WARRANT_STATUS_APPROVAL,
  Feature.ACTIVE_INCIDENTS,
  Feature.LICENSE_EXAMS,
];

type FeatureCategory =
  | "accounts"
  | "citizens"
  | "leoEms"
  | "dispatch"
  | "legal"
  | "community"
  | "other";

const FEATURE_CATEGORIES: Record<Exclude<FeatureCategory, "other">, Feature[]> = {
  accounts: [
    Feature.ALLOW_REGULAR_LOGIN,
    Feature.DISCORD_AUTH,
    Feature.FORCE_DISCORD_AUTH,
    Feature.STEAM_OAUTH,
    Feature.FORCE_STEAM_AUTH,
    Feature.FORCE_ACCOUNT_PASSWORD,
    Feature.API_TOKEN_REMINDER,
  ],
  citizens: [
    Feature.ALLOW_DUPLICATE_CITIZEN_NAMES,
    Feature.SOCIAL_SECURITY_NUMBERS,
    Feature.EDITABLE_SSN,
    Feature.EDITABLE_VIN,
    Feature.ALLOW_CITIZEN_UPDATE_LICENSE,
    Feature.ALLOW_CITIZEN_DELETION_BY_NON_ADMIN,
    Feature.CITIZEN_DELETE_ON_DEAD,
    Feature.COMMON_CITIZEN_CARDS,
    Feature.CITIZEN_CREATION_RECORDS,
    Feature.REQUIRED_CITIZEN_IMAGE,
    Feature.MEDICAL_RECORDS_CITIZEN_MANAGEABLE,
    Feature.SIGNAL_100_CITIZEN,
    Feature.PETS,
    Feature.WEAPON_REGISTRATION,
    Feature.DMV,
    Feature.BUREAU_OF_FIREARMS,
    Feature.LICENSE_EXAMS,
    Feature.MODERN_CITIZEN_THEME,
  ],
  leoEms: [
    Feature.LEO_TICKETS,
    Feature.LEO_BAIL,
    Feature.BADGE_NUMBERS,
    Feature.DIVISIONS,
    Feature.CREATE_USER_CITIZEN_LEO,
    Feature.LEO_EDITABLE_CITIZEN_PROFILE,
    Feature.CITIZEN_RECORD_APPROVAL,
    Feature.CITIZEN_RECORD_PAYMENTS,
    Feature.ACTIVE_WARRANTS,
    Feature.WARRANT_STATUS_APPROVAL,
    Feature.PANIC_BUTTON,
    Feature.ALLOW_MULTIPLE_UNITS_DEPARTMENTS_PER_USER,
    Feature.USER_DEFINED_CALLSIGN_COMBINED_UNIT,
    Feature.HOSPITAL_SERVICES,
    Feature.DOT,
  ],
  dispatch: [
    Feature.CALLS_911,
    Feature.CALL_911_APPROVAL,
    Feature.ACTIVE_DISPATCHERS,
    Feature.ACTIVE_INCIDENTS,
    Feature.UNIT_PRIVATE_MESSAGES,
    Feature.RADIO_CHANNEL_MANAGEMENT,
    Feature.RADIO,
    Feature.ERLC,
    Feature.TONES,
    Feature.AOP,
  ],
  legal: [Feature.COURTHOUSE, Feature.COURTHOUSE_POSTS, Feature.OPEN_LAW_BOOK],
  community: [
    Feature.BLEETER,
    Feature.BUSINESS,
    Feature.TOW,
    Feature.TAXI,
    Feature.TRUCK_LOGS,
    Feature.CUSTOM_TEXTFIELD_VALUES,
  ],
};

function getFeatureCategory(feature: Feature): FeatureCategory {
  for (const [category, features] of Object.entries(FEATURE_CATEGORIES)) {
    if (features.includes(feature)) return category as FeatureCategory;
  }
  return "other";
}

const CATEGORY_ORDER: FeatureCategory[] = [
  "accounts",
  "citizens",
  "leoEms",
  "dispatch",
  "legal",
  "community",
  "other",
];

type StatusFilter = "all" | "enabled" | "disabled";

export function CADFeaturesTab() {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<FeatureCategory | "all">("all");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");

  const common = useTranslations("Common");
  const { state, execute } = useFetch();
  const { cad, setCad } = useAuth();
  const tFeature = useTranslations("Features");

  const featuresList = React.useMemo(() => {
    return Object.values(Feature).map((feature) => {
      const hasURL = featuresWithURL.includes(feature);

      const name = tFeature(feature);
      const url = hasURL ? tFeature(`${feature}-url`) : null;
      const description = tFeature.rich(`${feature}-description`, {
        b: (children) => <b>{children}</b>,
      });

      return { feature, name, description, url, category: getFeatureCategory(feature) };
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function createInitialValues() {
    const obj = {} as Partial<Record<Feature, Pick<CadFeature, "feature" | "isEnabled">>>;

    const { options, ...cadFeatures } = cad?.features ?? {};
    for (const key in cadFeatures) {
      const feature = cadFeatures[key as keyof typeof cadFeatures];

      obj[key as Feature] = {
        feature: key as Feature,
        isEnabled: feature,
      };
    }

    return obj;
  }

  function createInitialOptions() {
    const obj = {} as CadFeatureOptions;

    const cadFeatures = cad?.features;
    for (const _key in cadFeatures) {
      const typedKey = _key as keyof CadFeatureOptions;
      const option = cadFeatures.options?.[typedKey] ?? DEFAULT_FEATURE_OPTIONS[typedKey];

      if (option) {
        // @ts-expect-error the types are overlapping, however, it will correctly assign the correct value
        obj[typedKey] = option;
      }
    }

    return obj;
  }

  async function onSubmit(values: typeof INITIAL_VALUES) {
    if (!cad) return;
    const featuresArr = Object.entries(values.features).map(([key, value]) => {
      const extraFields = values.options[key as keyof CadFeatureOptions] ?? undefined;

      return {
        feature: key as Feature,
        isEnabled: value.isEnabled,
        extraFields,
      };
    });

    const { json } = await execute<PutCADFeaturesData>({
      path: "/admin/manage/cad-settings/features",
      method: "PUT",
      data: { features: featuresArr, options: values.options },
    });

    if (json.id) {
      setCad({ ...cad, ...json });
      toastMessage({
        icon: "success",
        title: common("success"),
        message: common("savedSettingsSuccess"),
      });
    }
  }

  const INITIAL_VALUES = {
    features: createInitialValues(),
    options: createInitialOptions(),
  };

  const initialFeatures = INITIAL_VALUES.features;

  function isFeatureEnabled(features: typeof INITIAL_VALUES.features, feature: Feature): boolean {
    return (
      features[feature]?.isEnabled ??
      // @ts-expect-error - this is fine
      DEFAULT_DISABLED_FEATURES[feature]?.isEnabled ??
      true
    );
  }

  return (
    <TabsContent value={SettingsTabs.Features} className="mt-3">
      <header className="mb-4">
        <SettingsTabHeader icon={<ToggleOn size={20} />}>
          {tFeature("enableOrDisableFeatures")}
        </SettingsTabHeader>
        <p className="mt-1 text-neutral-600 dark:text-gray-400">{tFeature("featuresIntro")}</p>
      </header>

      <Formik onSubmit={onSubmit} initialValues={INITIAL_VALUES}>
        {({ setFieldValue, values }) => {
          const query = search.trim().toLowerCase();
          const matchesStatus = (feature: Feature) =>
            statusFilter === "all" ||
            (statusFilter === "enabled") === isFeatureEnabled(values.features, feature);

          const baseList = featuresList.filter(
            (feature) =>
              matchesStatus(feature.feature) &&
              (!query || feature.name.toLowerCase().includes(query)),
          );
          const visible = baseList.filter(
            (feature) => category === "all" || feature.category === category,
          );

          const changedCount = featuresList.filter(
            (feature) =>
              isFeatureEnabled(values.features, feature.feature) !==
              isFeatureEnabled(initialFeatures, feature.feature),
          ).length;

          const enabledCount = featuresList.filter((feature) =>
            isFeatureEnabled(values.features, feature.feature),
          ).length;

          const groups = CATEGORY_ORDER.map((key) => ({
            key,
            items: visible.filter((feature) => feature.category === key),
          })).filter((group) => group.items.length > 0);

          return (
            <Form>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end mb-3">
                <TextField
                  label={common("search")}
                  className="w-full lg:max-w-sm"
                  name="search"
                  value={search}
                  onChange={(value) => setSearch(value)}
                  placeholder={tFeature("searchFeatures")}
                />

                <div
                  role="radiogroup"
                  aria-label={tFeature("filterByStatus")}
                  className="inline-flex rounded-lg border border-gray-200 dark:border-quaternary p-0.5 bg-white dark:bg-tertiary w-fit"
                >
                  {(["all", "enabled", "disabled"] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={statusFilter === key}
                      onClick={() => setStatusFilter(key)}
                      className={classNames(
                        "px-3 py-1 rounded-md text-sm font-medium transition-colors",
                        statusFilter === key
                          ? "bg-blue-600 text-white"
                          : "text-neutral-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-secondary",
                      )}
                    >
                      {tFeature(`status_${key}`)}
                    </button>
                  ))}
                </div>

                <p className="text-sm text-neutral-600 dark:text-gray-400 lg:ml-auto lg:mb-1.5">
                  {tFeature("enabledCount", { enabled: enabledCount, total: featuresList.length })}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-5" role="tablist">
                {(["all", ...CATEGORY_ORDER] as const).map((key) => {
                  const count =
                    key === "all"
                      ? baseList.length
                      : baseList.filter((feature) => feature.category === key).length;
                  if (key !== "all" && count <= 0) return null;

                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={category === key}
                      onClick={() => setCategory(key)}
                      className={classNames(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                        category === key
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-gray-200 bg-white text-neutral-700 hover:bg-gray-100 dark:border-quaternary dark:bg-tertiary dark:text-gray-300 dark:hover:bg-secondary",
                      )}
                    >
                      {tFeature(`category_${key}`)}
                      <span
                        className={classNames(
                          "text-xs rounded-full px-1.5",
                          category === key
                            ? "bg-white/20"
                            : "bg-gray-100 text-neutral-600 dark:bg-secondary dark:text-gray-400",
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {groups.length <= 0 ? (
                <p className="card px-4 py-6 text-center text-neutral-600 dark:text-gray-400">
                  {tFeature("noFeaturesFound")}
                </p>
              ) : null}

              {groups.map((group) => (
                <section key={group.key} className="mb-6">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-gray-400">
                    {tFeature(`category_${group.key}`)}
                  </h3>

                  <div className="grid gap-3 grid-cols-1 xl:grid-cols-2">
                    {group.items.map((feature) => {
                      const isEnabled = isFeatureEnabled(values.features, feature.feature);
                      const hasOptions = feature.feature in values.options;

                      return (
                        <article
                          key={feature.feature}
                          className={classNames(
                            "card p-4 flex flex-col gap-2 transition-colors",
                            isEnabled && "!border-blue-500/40",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="font-semibold leading-snug">{feature.name}</h4>
                              {feature.url ? (
                                <Link
                                  className="text-sm underline inline-flex items-center gap-1 text-blue-600 dark:text-blue-400"
                                  target="_blank"
                                  href={feature.url}
                                >
                                  {common("learnMore")}
                                  <BoxArrowUpRight className="inline-block w-3 h-3" />
                                </Link>
                              ) : null}
                            </div>

                            <SwitchField
                              aria-label={feature.name}
                              isSelected={isEnabled}
                              onChange={(isSelected) =>
                                setFieldValue(`features.${feature.feature}.isEnabled`, isSelected)
                              }
                              name="enabled"
                            />
                          </div>

                          <p className="text-sm text-neutral-600 dark:text-gray-400">
                            {feature.description}
                          </p>

                          {hasOptions ? (
                            <div className="pt-2 mt-1 border-t border-gray-200 dark:border-quaternary">
                              {Feature.LICENSE_EXAMS === feature.feature ? (
                                <SelectField
                                  isDisabled={!values.features[feature.feature]?.isEnabled}
                                  isClearable
                                  selectedKeys={values.options[feature.feature]}
                                  onSelectionChange={(keys) =>
                                    setFieldValue(`options.${feature.feature}`, keys)
                                  }
                                  selectionMode="multiple"
                                  label="Types"
                                  options={Object.values(LicenseExamType).map((v) => ({
                                    label: v.toLowerCase(),
                                    value: v,
                                  }))}
                                />
                              ) : Feature.COURTHOUSE === feature.feature ? (
                                <SelectField
                                  isDisabled={!values.features[feature.feature]?.isEnabled}
                                  isClearable
                                  selectedKeys={values.options[feature.feature]}
                                  onSelectionChange={(keys) =>
                                    setFieldValue(`options.${feature.feature}`, keys)
                                  }
                                  selectionMode="multiple"
                                  label={tFeature("types")}
                                  options={Object.values(CourthouseType).map((v) => ({
                                    label: tFeature(v),
                                    value: v,
                                  }))}
                                />
                              ) : null}
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}

              <div className="sticky bottom-0 z-10 -mx-1 mt-4 px-1 py-3 flex items-center justify-end gap-3 bg-gray-50/90 dark:bg-primary/90 backdrop-blur border-t border-gray-200 dark:border-quaternary">
                {changedCount > 0 ? (
                  <span className="text-sm text-amber-700 dark:text-amber-300">
                    {tFeature("unsavedChanges", { count: changedCount })}
                  </span>
                ) : null}
                <Button
                  className="flex items-center"
                  variant="blue"
                  type="submit"
                  disabled={state === "loading"}
                >
                  {state === "loading" ? <Loader className="mr-3 border-red-300" /> : null}
                  {common("save")}
                </Button>
              </div>
            </Form>
          );
        }}
      </Formik>
    </TabsContent>
  );
}
