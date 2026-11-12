import * as React from "react";
import { Modal } from "components/modal/Modal";
import { useAuth } from "context/AuthContext";
import { Button } from "@snailycad/ui";
import { classNames } from "lib/classNames";
import { CheckCircleFill } from "react-bootstrap-icons";
import {
  type UiTheme,
  OPEN_THEME_PICKER_EVENT,
  applyUiTheme,
  getSavedUiTheme,
  saveUiTheme,
} from "lib/ui-theme";

const THEMES: { id: UiTheme; name: string; description: string; colors: string[] }[] = [
  {
    id: "new",
    name: "New",
    description: "The refreshed October 2026 look: deeper, cooler colours and cleaner cards.",
    colors: ["#0f1117", "#171a22", "#2a2e3a", "#2563eb"],
  },
  {
    id: "classic",
    name: "Classic",
    description: "The original SnailyCAD colours and cards you may already be used to.",
    colors: ["#16151a", "#1f1e26", "#35343c", "#454349"],
  },
];

function Preview({ colors }: { colors: string[] }) {
  const [page, card, control, accent] = colors;

  return (
    <div
      aria-hidden
      className="h-28 rounded-lg overflow-hidden border border-black/10 p-2 flex flex-col gap-1.5"
      style={{ backgroundColor: page }}
    >
      <div className="h-4 rounded" style={{ backgroundColor: card }} />
      <div className="flex-1 rounded p-2 flex flex-col gap-1.5" style={{ backgroundColor: card }}>
        <div className="h-2 w-2/3 rounded-full" style={{ backgroundColor: control }} />
        <div className="h-2 w-1/2 rounded-full" style={{ backgroundColor: control }} />
        <div className="mt-auto h-3 w-12 rounded" style={{ backgroundColor: accent }} />
      </div>
    </div>
  );
}

/**
 * asks users which theme they want the first time they sign in. Can be reopened from the account
 * menu. The choice is stored per browser.
 */
export function ThemePickerModal() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<UiTheme>("new");

  React.useEffect(() => {
    if (!user) return;
    const saved = getSavedUiTheme();
    if (saved) {
      setSelected(saved);
    } else {
      setIsOpen(true);
    }
  }, [user]);

  React.useEffect(() => {
    function handleOpen() {
      setSelected(getSavedUiTheme() ?? "new");
      setIsOpen(true);
    }

    window.addEventListener(OPEN_THEME_PICKER_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_THEME_PICKER_EVENT, handleOpen);
  }, []);

  function handleSelect(theme: UiTheme) {
    setSelected(theme);
    // live preview while choosing
    applyUiTheme(theme);
  }

  function handleSave() {
    saveUiTheme(selected);
    setIsOpen(false);
  }

  function handleClose() {
    // closing without choosing keeps the current (or default) theme
    saveUiTheme(getSavedUiTheme() ?? selected);
    setIsOpen(false);
  }

  if (!user) return null;

  return (
    <Modal className="w-[640px]" title="Personalise your CAD" isOpen={isOpen} onClose={handleClose}>
      <p className="mb-4 text-neutral-600 dark:text-gray-400">
        Pick how the CAD looks for you. You can change this at any time from your account menu.
      </p>

      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-gray-400">
        Theme
      </h3>

      <div role="radiogroup" aria-label="Theme" className="grid gap-3 sm:grid-cols-2">
        {THEMES.map((theme) => {
          const isSelected = selected === theme.id;

          return (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleSelect(theme.id)}
              className={classNames(
                "text-left rounded-xl border-2 p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70",
                isSelected
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                  : "border-gray-200 hover:border-gray-300 dark:border-quaternary dark:hover:border-quinary",
              )}
            >
              <Preview colors={theme.colors} />
              <span className="mt-3 flex items-center justify-between">
                <span className="font-semibold">{theme.name}</span>
                {isSelected ? (
                  <CheckCircleFill aria-hidden className="w-5 h-5 text-blue-500" />
                ) : null}
              </span>
              <span className="block mt-1 text-sm text-neutral-600 dark:text-gray-400">
                {theme.description}
              </span>
            </button>
          );
        })}
      </div>


      <footer className="flex justify-end mt-6">
        <Button variant="blue" onPress={handleSave}>
          Save
        </Button>
      </footer>
    </Modal>
  );
}
