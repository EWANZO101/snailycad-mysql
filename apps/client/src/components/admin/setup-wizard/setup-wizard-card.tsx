import * as React from "react";
import { useAuth } from "context/AuthContext";
import { useModal } from "state/modalState";
import { ModalIds } from "types/modal-ids";
import { Button } from "@snailycad/ui";
import { Magic, X } from "react-bootstrap-icons";
import { SETUP_WIZARD_DISMISSED_KEY } from "./setup-wizard-modal";
import { usePermission } from "hooks/usePermission";
import { Permissions } from "@snailycad/permissions";

/**
 * A brand-new CAD is created with `name: "Rename"` (see apps/api/src/lib/upsert-cad.ts) and nothing
 * else configured. This card nudges the owner toward the setup wizard until it's been dismissed once.
 */
export function SetupWizardCard() {
  const { cad } = useAuth();
  const modalState = useModal();
  const { hasPermissions } = usePermission();
  const [dismissed, setDismissed] = React.useState(true);

  const looksUnconfigured = cad?.name === "Rename";

  React.useEffect(() => {
    try {
      setDismissed(localStorage.getItem(SETUP_WIZARD_DISMISSED_KEY) === "true");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!hasPermissions([Permissions.ManageCADSettings])) return null;
  if (dismissed && !looksUnconfigured) return null;

  return (
    <section className="card p-4 mb-6 flex items-center justify-between gap-3 flex-wrap !border-blue-400/60 dark:!border-blue-500/40">
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-9 h-9 rounded-lg grid place-content-center bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <Magic size={16} />
        </span>
        <div>
          <p className="font-semibold">
            {looksUnconfigured ? "Finish setting up your CAD" : "New to SnailyCAD?"}
          </p>
          <p className="text-sm text-neutral-600 dark:text-gray-400">
            {looksUnconfigured
              ? "Your CAD still has its default name. Run the setup wizard to name it, pick features, and add your first department."
              : "Walk through the basics: CAD name, whitelisting, features, and departments."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          className="flex items-center gap-2 whitespace-nowrap"
          onPress={() => modalState.openModal(ModalIds.SetupWizard)}
        >
          <Magic size={14} /> Open Setup Wizard
        </Button>

        {looksUnconfigured ? null : (
          <button
            type="button"
            aria-label="Dismiss"
            title="Dismiss"
            onClick={() => {
              try {
                localStorage.setItem(SETUP_WIZARD_DISMISSED_KEY, "true");
              } catch {
                // ignore
              }
              setDismissed(true);
            }}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-secondary transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </section>
  );
}
