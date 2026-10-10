import * as React from "react";
import type { GetServerSideProps } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useTranslations } from "use-intl";
import { Layout } from "components/Layout";
import { getSessionUser } from "lib/auth";
import { getTranslations } from "lib/getTranslation";
import { ModalIds } from "types/modal-ids";
import { useModal } from "state/modalState";
import { requestAll } from "lib/utils";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";
import { useAreaOfPlay } from "hooks/global/useAreaOfPlay";
import { Title } from "components/shared/Title";
import { CitizenList } from "components/citizen/citizen-list/citizen-list";
import type { GetCitizensData } from "@snailycad/types/api";
import { useLoadValuesClientSide } from "hooks/useLoadValuesClientSide";
import { ValueType } from "@snailycad/types";
import { useSignal100 } from "hooks/shared/useSignal100";
import { Button, buttonVariants } from "@snailycad/ui";
import {
  CarFrontFill,
  Crosshair,
  GeoAltFill,
  PeopleFill,
  PersonCheckFill,
  PersonPlusFill,
  TaxiFrontFill,
  TelephoneFill,
  TruckFlatbed,
} from "react-bootstrap-icons";
import type { Icon } from "react-bootstrap-icons";

const RegisterVehicleModal = dynamic(
  async () =>
    (await import("components/citizen/vehicles/modals/register-vehicle-modal"))
      .RegisterVehicleModal,
  { ssr: false },
);
const RegisterWeaponModal = dynamic(
  async () =>
    (await import("components/citizen/weapons/register-weapon-modal")).RegisterWeaponModal,
  { ssr: false },
);
const ManageCallModal = dynamic(
  async () => (await import("components/citizen/tow/manage-tow-call")).ManageCallModal,
  { ssr: false },
);
const ClaimCitizenModal = dynamic(
  async () => (await import("components/citizen/modals/claim-citizen-modal")).ClaimCitizenModal,
  { ssr: false },
);
const Manage911CallModal = dynamic(
  async () =>
    (await import("components/dispatch/active-calls/modals/manage-911-call-modal"))
      .Manage911CallModal,
  { ssr: false },
);

interface Props {
  citizens: GetCitizensData;
}

export default function CitizenPage({ citizens }: Props) {
  useLoadValuesClientSide({
    valueTypes: [ValueType.LICENSE],
  });

  const t = useTranslations("Citizen");
  const tClaims = useTranslations("CitizenClaims");
  const { SIGNAL_100_CITIZEN, TOW, TAXI, WEAPON_REGISTRATION, CALLS_911, MODERN_CITIZEN_THEME } =
    useFeatureEnabled();

  const modalState = useModal();
  const [modal, setModal] = React.useState<string | null>(null);
  const { showAop, areaOfPlay } = useAreaOfPlay();
  const signal100 = useSignal100();

  return (
    <Layout className="dark:text-white">
      <signal100.Component
        enabled={SIGNAL_100_CITIZEN && signal100.enabled}
        audio={signal100.audio}
      />

      {MODERN_CITIZEN_THEME ? (
        <>
          <header className="relative mt-3 mb-6 overflow-hidden rounded-2xl border border-gray-300 bg-gradient-to-br from-white to-gray-100 p-6 shadow-sm dark:border-quinary dark:from-tertiary dark:to-primary">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  <PeopleFill className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <Title className="!mb-0 text-3xl font-bold tracking-tight">{t("citizens")}</Title>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {citizens.totalCount} {t("citizens").toLowerCase()}
                  </p>
                </div>
              </div>

              {showAop ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  <GeoAltFill className="h-3.5 w-3.5" aria-hidden />
                  AOP: {areaOfPlay}
                </span>
              ) : null}
            </div>
          </header>

          <ul className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <li>
              <ActionTile href="/citizen/create" icon={PersonPlusFill} accent="blue">
                {t("createCitizen")}
              </ActionTile>
            </li>
            <li>
              <ActionTile
                icon={CarFrontFill}
                accent="violet"
                onPress={() => modalState.openModal(ModalIds.RegisterVehicle)}
              >
                {t("registerVehicle")}
              </ActionTile>
            </li>
            {WEAPON_REGISTRATION ? (
              <li>
                <ActionTile
                  icon={Crosshair}
                  accent="rose"
                  onPress={() => modalState.openModal(ModalIds.RegisterWeapon)}
                >
                  {t("registerWeapon")}
                </ActionTile>
              </li>
            ) : null}
            {TOW ? (
              <li>
                <ActionTile
                  icon={TruckFlatbed}
                  accent="amber"
                  onPress={() => {
                    setModal("tow");
                    modalState.openModal(ModalIds.ManageTowCall);
                  }}
                >
                  {t("createTowCall")}
                </ActionTile>
              </li>
            ) : null}
            {TAXI ? (
              <li>
                <ActionTile
                  icon={TaxiFrontFill}
                  accent="yellow"
                  onPress={() => {
                    setModal("taxi");
                    modalState.openModal(ModalIds.ManageTowCall);
                  }}
                >
                  {t("createTaxiCall")}
                </ActionTile>
              </li>
            ) : null}
            {CALLS_911 ? (
              <li>
                <ActionTile
                  icon={TelephoneFill}
                  accent="red"
                  onPress={() => modalState.openModal(ModalIds.Manage911Call)}
                >
                  {t("create911Call")}
                </ActionTile>
              </li>
            ) : null}
            <li>
              <ActionTile
                icon={PersonCheckFill}
                accent="emerald"
                onPress={() => modalState.openModal(ModalIds.ClaimCitizen)}
              >
                {tClaims("claimCitizen")}
              </ActionTile>
            </li>
          </ul>
        </>
      ) : (
        <>
          <header className="my-3">
            <Title className="mb-2">{t("citizens")}</Title>
            {showAop ? <h2 className="font-semibold text-xl">AOP: {areaOfPlay}</h2> : null}
          </header>

          <ul className="grid grid-cols-1 gap-2 mb-3 sm:grid-cols-2 md:grid-cols-3">
            <li>
              <Link
                href="/citizen/create"
                className={buttonVariants({
                  className: "rounded-md transition-all p-1 px-4 block w-full",
                })}
              >
                {t("createCitizen")}
              </Link>
            </li>
            <li>
              <Button
                onPress={() => modalState.openModal(ModalIds.RegisterVehicle)}
                className="text-left w-full"
              >
                {t("registerVehicle")}
              </Button>
            </li>
            {WEAPON_REGISTRATION ? (
              <li>
                <Button
                  onPress={() => modalState.openModal(ModalIds.RegisterWeapon)}
                  className="text-left w-full"
                >
                  {t("registerWeapon")}
                </Button>
              </li>
            ) : null}

            {TOW ? (
              <li>
                <Button
                  onPress={() => {
                    setModal("tow");
                    modalState.openModal(ModalIds.ManageTowCall);
                  }}
                  className="text-left w-full"
                >
                  {t("createTowCall")}
                </Button>
              </li>
            ) : null}
            {TAXI ? (
              <li>
                <Button
                  onPress={() => {
                    setModal("taxi");
                    modalState.openModal(ModalIds.ManageTowCall);
                  }}
                  className="text-left w-full"
                >
                  {t("createTaxiCall")}
                </Button>
              </li>
            ) : null}
            {CALLS_911 ? (
              <li>
                <Button
                  onPress={() => modalState.openModal(ModalIds.Manage911Call)}
                  className="text-left w-full"
                >
                  {t("create911Call")}
                </Button>
              </li>
            ) : null}
            <li>
              <Button
                onPress={() => modalState.openModal(ModalIds.ClaimCitizen)}
                className="text-left w-full"
              >
                {tClaims("claimCitizen")}
              </Button>
            </li>
          </ul>
        </>
      )}

      <CitizenList citizens={citizens} />

      <RegisterVehicleModal
        onCreate={() => modalState.closeModal(ModalIds.RegisterVehicle)}
        vehicle={null}
      />
      {WEAPON_REGISTRATION ? (
        <RegisterWeaponModal
          onCreate={() => modalState.closeModal(ModalIds.RegisterWeapon)}
          weapon={null}
        />
      ) : null}
      {CALLS_911 ? <Manage911CallModal call={null} /> : null}
      <ClaimCitizenModal />
      {TOW || TAXI ? <ManageCallModal isTow={modal === "tow"} call={null} /> : null}
    </Layout>
  );
}

const ACCENTS = {
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  rose: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  yellow: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-300",
  red: "bg-red-500/15 text-red-600 dark:text-red-400",
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

interface ActionTileProps {
  icon: Icon;
  accent: keyof typeof ACCENTS;
  children: React.ReactNode;
  href?: string;
  onPress?(): void;
}

function ActionTile({ icon: TileIcon, accent, children, href, onPress }: ActionTileProps) {
  const className =
    "group flex h-full w-full flex-col items-start gap-3 rounded-xl border border-gray-300 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-400 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-quinary dark:bg-tertiary dark:hover:border-neutral-500";
  const content = (
    <>
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-lg transition-transform group-hover:scale-110 ${ACCENTS[accent]}`}
      >
        <TileIcon className="h-5 w-5" aria-hidden />
      </span>
      <span className="text-sm font-semibold leading-tight">{children}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onPress} className={className}>
      {content}
    </button>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ locale, req }) => {
  const user = await getSessionUser(req);
  const [data] = await requestAll(req, [["/citizen", { citizens: [], totalCount: 0 }]]);

  return {
    props: {
      citizens: data,
      session: user,
      messages: {
        ...(await getTranslations(["citizen", "leo", "calls", "common"], user?.locale ?? locale)),
      },
    },
  };
};
