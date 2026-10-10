import * as React from "react";
import { Modal } from "components/modal/Modal";
import { useAuth } from "context/AuthContext";
import { Button } from "@snailycad/ui";
import { Stars } from "react-bootstrap-icons";
import { UI_THEME_CHOSEN_EVENT, getSavedUiTheme } from "lib/ui-theme";

/** bump this when a new batch of updates should be shown again to everyone */
export const WHATS_NEW_RELEASE_ID = "2026-10-planned";
const STORAGE_KEY = "snailycad_whats_new_seen";
const OPEN_EVENT = "snailycad:open-whats-new";

interface UpdateSection {
  title: string;
  items: string[];
}

/** roadmap items that are not built yet (https://github.com/EWANZO101/sna1/blob/main/readme.md) */
const PLANNED: UpdateSection[] = [
  {
    title: "In-game (FiveM)",
    items: [
      "Civilian ID cards: show your character's ID to the nearest player, for any framework.",
      "Automatic in-game route to a call when you attach to it or a panic button is pressed.",
      "Radio channel sync: dispatch changes your in-game radio channel from the CAD.",
      "Police and fire units on the in-game map, with callsigns and radio details.",
      "ANPR/ALPR: BOLO plates kept in sync with the in-game plate readers.",
      "Add-on map tiles for custom maps beyond the standard GTA V map.",
    ],
  },
  {
    title: "Communication",
    items: [
      "Private officer-to-officer messages with unread indicators.",
      "Snaily Radio, a radio experience built around the CAD.",
      "Multiple tones per department, playable for a person, department or call.",
    ],
  },
  {
    title: "Mobile & Mini-CAD",
    items: [
      "Better phone and iPad layouts for calls, units, forms and navigation.",
      "Mini-CAD overlay: latest 911 call, attached units and previous/next call with keybinds.",
      "A look at a dedicated mobile or installable app.",
    ],
  },
  {
    title: "Discord",
    items: [
      "Turn individual Discord log types on or off, or enable them all at once.",
      "Discord bot commands for duty hours by user and job.",
    ],
  },
  {
    title: "Admin & community",
    items: [
      "Step-by-step workflows that show which steps are done, optional or still needed.",
      "A community library for sharing penal code files, with validation before import.",
      "Unraid / Docker installation template and guide.",
      "Updated documentation for integrations, frameworks, recovery tools and custom locales.",
    ],
  },
];

const UPDATES: UpdateSection[] = [
  {
    title: "New look",
    items: [
      "Refreshed design across the whole CAD: deeper dark theme, cleaner cards, tables, buttons, inputs, dropdowns and modals. All menus are where they were.",
      "Navigation shows the page you're on and highlights links on hover.",
      "Choose between the new theme and the classic SnailyCAD theme the first time you sign in, or later from your account menu.",
      "Pick your emergency number (911, 999, 112, 000, 111 or your own) and the whole CAD uses it instead of 911.",
      "Tables have row dividers and highlight the row under your cursor.",
    ],
  },
  {
    title: "Admin area",
    items: [
      "Reorganised admin sidebar: management pages are grouped into People, Units, Community and System, and there's a search box to find any admin page.",
      "Values and Import lists are collapsible and remember whether you left them open.",
      "New admin dashboard with compact statistics, a 'Needs attention' list (pending users, units, businesses and courthouse requests) and quick links.",
      "One-click 'Update CAD' on the admin dashboard: shows your version and pending changes, updates the CAD (standalone, Docker or local build) and takes you to a live progress page with the update log.",
      "Recovery tools page and a recovery token, so owners can get back into the CAD if they're locked out.",
      "Prune citizens by criteria, with a preview, an export and a confirmation step before anything is deleted.",
      "Citizen claim requests: users can ask to take over a citizen created by staff, and admins approve or reject the request.",
      "Duty hours report for units, with on-duty sessions you can correct.",
      "Users can no longer grant permissions they don't have themselves (applies to users and custom roles).",
      "New permissions: Manage Pending Users, Manage Officer Rank, Manage Officer Callsign and View All Players on the Live Map.",
      "11 new Discord webhook types: registrations, bans, BOLO updates and deletions, warrant status, ended 911 calls, citizens created or deleted, expungement requests, and tow and taxi calls.",
      "CAD Settings → Features is organised into categories, with search, an enabled/disabled filter and a count of unsaved changes.",
      "Manage languages from CAD Settings → Custom Locales: add a language, fill in missing files, set the default and apply, all with buttons.",
      "Penal code export, and penal codes grouped in the law book.",
      "Optional reminder banner for users who haven't set up their in-game API token (off by default).",
    ],
  },
  {
    title: "Dispatch & LEO",
    items: [
      "Officers with Manage Call History can edit and end calls.",
      "End several 911 calls at once from the call history.",
      "Link incidents to calls beyond the first page, with search as you type.",
      "The live map only shows all players to people with the new staff permission. Dispatch still sees units.",
      "Drug tests can be recorded and viewed in name search.",
      "Fixes to jail and arrest status, including search and sorting.",
    ],
  },
  {
    title: "EMS & Fire",
    items: [
      "Fire reports: incidents can be Medical, Fire, Fire investigation or Fire inspection, with cause of fire, property damage and inspection result.",
      "Filter EMS/FD incidents by report type.",
      "EMS/FD incidents now use the Manage EMS/FD Incidents permission for creating, editing and deleting.",
      "'Vehicle involved' is now saved on EMS/FD incidents.",
      "EMS/FD incidents can be linked to 911 calls.",
    ],
  },
  {
    title: "Ready to use",
    items: [
      "Comes with the official SnailyCAD value templates: departments, 10-codes, situation codes, addresses and postals, penal codes, vehicles, weapons, licenses, call types, flags, genders, ethnicities, blood groups and impound lots.",
      "Includes an officer rank ladder from Cadet to Chief of Police, with LSPD and EMS set as the default departments.",
    ],
  },
  {
    title: "Citizens",
    items: [
      "Citizen aliases.",
      "Optional modern citizen theme.",
    ],
  },
  {
    title: "Sign-in & performance",
    items: [
      "Discord login only skips the consent screen for users who have already authorised the app.",
      "Faster restarts: dependencies are only reinstalled and the CAD only rebuilt when something changed.",
      "Demo mode: a shared demo account whose changes reset automatically.",
      "While the CAD updates, visitors see a progress page with a live percentage and time remaining instead of an error.",
    ],
  },
];

function getSeenKey(userId: string) {
  return `${STORAGE_KEY}_${userId}`;
}

/** opens the "What's new" modal from anywhere (e.g. the account dropdown) */
export function openWhatsNew() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function WhatsNewModal() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const userId = user?.id ?? null;

  React.useEffect(() => {
    if (!userId) return;
    const id = userId;

    function openIfUnseen() {
      try {
        if (window.localStorage.getItem(getSeenKey(id)) !== WHATS_NEW_RELEASE_ID) {
          setIsOpen(true);
        }
      } catch {
        // storage unavailable: don't show it on every page load
      }
    }

    // first-time users pick a theme first, then see what's new
    if (getSavedUiTheme()) {
      openIfUnseen();
      return;
    }

    window.addEventListener(UI_THEME_CHOSEN_EVENT, openIfUnseen, { once: true });
    return () => window.removeEventListener(UI_THEME_CHOSEN_EVENT, openIfUnseen);
  }, [userId]);

  React.useEffect(() => {
    function handleOpen() {
      setIsOpen(true);
    }

    window.addEventListener(OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_EVENT, handleOpen);
  }, []);

  function handleClose() {
    setIsOpen(false);
    if (!userId) return;

    try {
      window.localStorage.setItem(getSeenKey(userId), WHATS_NEW_RELEASE_ID);
    } catch {
      // storage unavailable: it will show again next time
    }
  }

  if (!userId) return null;

  return (
    <Modal
      className="w-[760px]"
      title="What's new: October 2026"
      isOpen={isOpen}
      onClose={handleClose}
    >
      <div className="flex items-start gap-3 mb-4 rounded-lg p-3 bg-blue-50 text-blue-900 dark:bg-blue-500/10 dark:text-blue-100">
        <Stars aria-hidden className="w-5 h-5 mt-0.5 shrink-0" />
        <p className="text-sm">
          Here's everything added to this CAD in October 2026, plus what's planned next. You can
          open this list again at any time from your account menu.
        </p>
      </div>

      <div className="max-h-[60vh] overflow-y-auto thin-scrollbar pr-2 space-y-5">
        {UPDATES.map((section) => (
          <section key={section.title}>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-gray-400 mb-2">
              {section.title}
            </h3>
            <ul className="space-y-1.5 list-disc pl-5 marker:text-blue-500">
              {section.items.map((item) => (
                <li key={item} className="text-[15px] leading-snug">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="pt-4 mt-2 border-t border-dashed border-gray-300 dark:border-quinary">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-gray-400">
              Planned / coming soon
            </h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
              Not available yet
            </span>
          </div>
          <p className="mb-3 text-sm text-neutral-600 dark:text-gray-400">
            On the roadmap but not built yet. Plans can change.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {PLANNED.map((section) => (
              <div
                key={section.title}
                className="rounded-lg border border-gray-200 dark:border-quaternary p-3 bg-gray-50 dark:bg-primary/60"
              >
                <h4 className="font-semibold text-sm mb-1.5">{section.title}</h4>
                <ul className="space-y-1 list-disc pl-4 marker:text-amber-500 text-sm text-neutral-700 dark:text-gray-300">
                  {section.items.map((item) => (
                    <li key={item} className="leading-snug">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="flex justify-end mt-5">
        <Button onPress={handleClose}>Got it</Button>
      </footer>
    </Modal>
  );
}
