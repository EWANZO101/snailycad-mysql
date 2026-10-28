import * as React from "react";
import Link from "next/link";
import { Modal } from "components/modal/Modal";
import { useModal } from "state/modalState";
import { ModalIds } from "types/modal-ids";
import { useAuth } from "context/AuthContext";
import useFetch from "lib/useFetch";
import { Button, Input, Loader, SwitchField } from "@snailycad/ui";
import { toastMessage } from "lib/toastMessage";
import type { PutCADSettingsData } from "@snailycad/types/api";
import {
  ArrowLeft,
  ArrowRight,
  BuildingsFill,
  CheckCircleFill,
  GearFill,
  GeoAltFill,
  ShieldLockFill,
  SignpostSplitFill,
} from "react-bootstrap-icons";

export const SETUP_WIZARD_DISMISSED_KEY = "snailycad_setup_wizard_dismissed";

const STEPS = ["Basics", "Whitelist", "Features", "Departments", "Done"] as const;

export function SetupWizardModal() {
  const modalState = useModal();
  const { cad, setCad } = useAuth();
  const { execute, state } = useFetch();
  const isOpen = modalState.isOpen(ModalIds.SetupWizard);

  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState(cad?.name ?? "");
  const [areaOfPlay, setAreaOfPlay] = React.useState(cad?.areaOfPlay ?? "");
  const [whitelisted, setWhitelisted] = React.useState(cad?.whitelisted ?? false);

  React.useEffect(() => {
    if (isOpen && cad) {
      setName(cad.name ?? "");
      setAreaOfPlay(cad.areaOfPlay ?? "");
      setWhitelisted(cad.whitelisted ?? false);
      setStep(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function close() {
    try {
      localStorage.setItem(SETUP_WIZARD_DISMISSED_KEY, "true");
    } catch {
      // ignore (private browsing / storage disabled)
    }
    modalState.closeModal(ModalIds.SetupWizard);
  }

  async function saveAndNext(data: Record<string, unknown>) {
    if (!cad) {
      setStep((s) => s + 1);
      return;
    }

    const { json } = await execute<PutCADSettingsData>({
      path: "/admin/manage/cad-settings",
      method: "PUT",
      data: { ...cad, ...data },
    });

    if (json?.id) {
      setCad({ ...cad, ...json });
      toastMessage({ icon: "success", title: "Saved", message: "Your changes were saved." });
      setStep((s) => s + 1);
    }
  }

  const isSaving = state === "loading";
  const isLastStep = step === STEPS.length - 1;

  return (
    <Modal
      title="Setup Wizard"
      className="w-[600px]"
      isOpen={isOpen}
      onClose={close}
    >
      <ol className="flex items-center gap-1 mb-5">
        {STEPS.map((label, idx) => (
          <li key={label} className="flex-1">
            <div
              className={
                "h-1.5 rounded-full transition-colors " +
                (idx <= step ? "bg-blue-500" : "bg-gray-200 dark:bg-quaternary")
              }
            />
            <span
              className={
                "mt-1 block text-[11px] font-medium truncate " +
                (idx <= step
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-neutral-500 dark:text-gray-500")
              }
            >
              {idx + 1}. {label}
            </span>
          </li>
        ))}
      </ol>

      <div className="min-h-[220px]">
        {step === 0 ? (
          <div className="space-y-4">
            <StepIntro
              icon={<GeoAltFill />}
              title="Name your CAD"
              description="This name and area of play show up on the login screen and throughout the CAD."
            />

            <label className="block">
              <span className="text-sm font-medium">CAD name</span>
              <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
            </label>

            <label className="block">
              <span className="text-sm font-medium">Area of play</span>
              <Input
                className="mt-1"
                value={areaOfPlay}
                onChange={(e) => setAreaOfPlay(e.target.value)}
                placeholder="Los Santos"
              />
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <StepIntro
              icon={<ShieldLockFill />}
              title="Whitelist"
              description="When enabled, new citizens and characters must be manually approved by staff before they can be used."
            />

            <div className="card p-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">Require whitelist approval</p>
                <p className="text-sm text-neutral-600 dark:text-gray-400">
                  You can fine-tune tow/taxi/business whitelisting separately later in CAD
                  Settings → Whitelisting.
                </p>
              </div>
              <SwitchField
                aria-label="Require whitelist approval"
                isSelected={whitelisted}
                onChange={setWhitelisted}
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <StepIntro
              icon={<GearFill />}
              title="Choose your features"
              description="SnailyCAD has dozens of optional features (Business, Courthouse, Tow, Tones, License exams, and more). Pick the ones your community actually uses — everything else stays hidden."
            />
            <Link
              href="/admin/manage/cad-settings"
              className="card p-3 flex items-center justify-between gap-3 hover:border-blue-400 dark:hover:border-blue-500/60 transition-colors"
            >
              <span>Open CAD Settings → Features</span>
              <ArrowRight />
            </Link>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <StepIntro
              icon={<BuildingsFill />}
              title="Create your departments"
              description="Departments (e.g. Los Santos Police Department, San Andreas State Police) are the agencies your officers and deputies belong to. Add at least one so staff can go on-duty."
            />
            <Link
              href="/admin/values/department"
              className="card p-3 flex items-center justify-between gap-3 hover:border-blue-400 dark:hover:border-blue-500/60 transition-colors"
            >
              <span>Open Values → Departments</span>
              <ArrowRight />
            </Link>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <StepIntro
              icon={<CheckCircleFill />}
              title="You're ready to go"
              description="The basics are covered. A few things are worth a look when you have a moment:"
            />
            <ul className="space-y-2 text-sm">
              <li className="card p-3 flex items-center gap-2">
                <SignpostSplitFill className="text-neutral-500 shrink-0" />
                Set up Discord role sync and default permissions under CAD Settings → Permissions.
              </li>
              <li className="card p-3 flex items-center gap-2">
                <SignpostSplitFill className="text-neutral-500 shrink-0" />
                Add Discord/Slack webhooks for live updates under CAD Settings → Webhooks.
              </li>
              <li className="card p-3 flex items-center gap-2">
                <SignpostSplitFill className="text-neutral-500 shrink-0" />
                You can reopen this wizard any time from the admin dashboard.
              </li>
            </ul>
          </div>
        ) : null}
      </div>

      <footer className="flex items-center justify-between mt-5 pt-3 border-t border-gray-200 dark:border-quaternary">
        <Button variant="cancel" onPress={close}>
          {isLastStep ? "Close" : "Skip for now"}
        </Button>

        <div className="flex items-center gap-2">
          {step > 0 ? (
            <Button
              variant="default"
              className="flex items-center gap-2"
              onPress={() => setStep((s) => s - 1)}
            >
              <ArrowLeft /> Back
            </Button>
          ) : null}

          {step === 0 ? (
            <Button
              className="flex items-center gap-2"
              disabled={isSaving}
              onPress={() => saveAndNext({ name, areaOfPlay })}
            >
              {isSaving ? <Loader /> : null}
              Save &amp; continue <ArrowRight />
            </Button>
          ) : step === 1 ? (
            <Button
              className="flex items-center gap-2"
              disabled={isSaving}
              onPress={() => saveAndNext({ whitelisted })}
            >
              {isSaving ? <Loader /> : null}
              Save &amp; continue <ArrowRight />
            </Button>
          ) : isLastStep ? (
            <Button className="flex items-center gap-2" onPress={close}>
              <CheckCircleFill /> Finish
            </Button>
          ) : (
            <Button className="flex items-center gap-2" onPress={() => setStep((s) => s + 1)}>
              Next <ArrowRight />
            </Button>
          )}
        </div>
      </footer>
    </Modal>
  );
}

function StepIntro({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 items-start">
      <span className="shrink-0 w-9 h-9 rounded-lg grid place-content-center bg-blue-500/10 text-blue-600 dark:text-blue-400">
        {icon}
      </span>
      <div>
        <h4 className="font-semibold text-lg">{title}</h4>
        <p className="text-sm text-neutral-600 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
}
