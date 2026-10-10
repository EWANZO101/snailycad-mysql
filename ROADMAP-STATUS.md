# Roadmap Status

Tracks progress against the backlog in https://github.com/EWANZO101/sna1/blob/main/readme.md.
Last updated: 2026-10-10.

Legend: **Done** = implemented (syntax-checked, not yet tested in a browser) · **Partial** · **Todo** · **Needs decision** = out-of-repo or needs maintainer/product input.

| # | Item | Status | Notes |
|---|---|---|---|
| 1.1 | Search suggestions | Partial | Search-as-you-type for incidents in the Link Incidents modal |
| 1.2 | Easier workflows | Todo | |
| 2.1 | Recovery tools UI | Done | `/auth/recovery` page + `/recovery/*` API (enable regular login, disable forced OAuth/whitelist, restore access, reset password) |
| 2.2 | First-setup recovery token | Done | Generated into `apps/api/.recovery-token(.json)` (gitignored); admin card with acknowledge/rotate |
| 2.3 | Database configuration guide | Partial | `sh/docs/SYSTEM-REQUIREMENTS.md` |
| 3.1 | Unraid template | Needs decision | |
| 3.2 | Docs repo update | Needs decision | Separate repo (SnailyCAD/docs) |
| 4.1 | API token reminder | Done | `API_TOKEN_REMINDER` feature (off by default) + banner |
| 4.2–4.7 | FiveM scripts (ID card, routing, radio, ANPR, map tiles) | Needs decision | Live in separate FiveM resource repos |
| 5.1 | Restrict all-players live map | Done | `ViewAllPlayersOnLiveMap`; filtering is client-side (the FiveM live_map socket still sends all players) |
| 5.2 | Live map permission review | Done | |
| 6.x | Private messages / radio / tones | Todo | |
| 7.1 | Officers edit/end calls | Done | Via `ManageCallHistory` |
| 7.2 | Bulk call management | Done | `POST /911-calls/bulk-end` + "End selected" in call history |
| 7.3 | FD incident permissions | Done | Create/edit/delete with `ManageEmsFdIncidents`; creator is the EMS-FD deputy |
| 7.4 | Link incidents beyond page 1 | Done | Server-side `query` search |
| 7.5 | Non-medical FD reports | Done | EMS-FD incidents get a report type (Medical / Fire / Fire investigation / Inspection) plus cause, property damage and inspection result; filterable in the incidents table |
| 7.6 | More citizen record sections | Done | Aliases and drug tests. Police reports are already covered by records/incidents |
| 8.1 | Claim civilian character | Done | Claim requests + admin review page (`/admin/manage/citizen-claims`) |
| 8.2 | Prune citizens by criteria | Done | Filtered preview, export and confirmed delete; audit logged |
| 9.1 | No granting permissions you lack | Done | Server + UI; covers custom roles too |
| 9.2 | Pending-member approver | Done | `ManagePendingUsers` |
| 9.3 | Officer rank / callsign permissions | Done | `ManageOfficerRank`, `ManageOfficerCallsign` |
| 10.x | Discord webhooks / bot hours | Partial | 11 extra webhook types (registrations, bans, BOLOs, warrants, calls, citizens, expungements, tow/taxi); bot side is a separate repo |
| 11.1 | Duty clocking | Done | `/admin/manage/duty-hours` report + session editing |
| 12.x | Mobile / Mini-CAD | Todo | |
| 13.x | Penal code / locales | Partial | Grouped penal codes in the law book, penal code export, custom locales tab |
| 14.1 | Discord OAuth prompt | Done | `prompt=none` only for known-authorised users; consent fallback |
| 15.x | Integration docs | Partial | NGINX example + system requirements |

## Also done
- Jail/arrest status fixes (arrested flag derived from active arrest reports, search, sorting)
- Modern citizen theme (`MODERN_CITIZEN_THEME` feature)
- EMS-FD incident linking on calls
- Startup optimisation: `start.sh` skips install/build when nothing changed (`--force-build`, `--force-install`, `--no-build`), memory-aware build heap, `--inspect` removed from API start, Next prod optimisations, Sentry token moved to env
- EMS-FD incidents page/table now gate create/edit/delete on `ManageEmsFdIncidents` (was `ManageIncidents`); `vehicleInvolved` is now actually saved
- `sh/docs/nginx-snailycad.conf.example`, `sh/docs/SYSTEM-REQUIREMENTS.md`

## To deploy
```bash
cd /home/snaily-cadv4
./start.sh --force-build   # installs if needed, builds, runs `prisma migrate deploy`, starts
```
New migrations: `20261009200000_modern_citizen_theme`, `20261009220000_api_token_reminder`, `20261009230300_citizen_claim_requests`, `20261009230400_extra_discord_webhook_types`, `20261009230500_citizen_aliases_drug_tests`, `20261010120000_ems_fd_report_types`.
