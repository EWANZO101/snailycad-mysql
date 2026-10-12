<p align="center">
  <a href="https://snailycad.org" target="_blank" rel="noopener noreferrer">
    <img width="180" src="https://raw.githubusercontent.com/SnailyCAD/website/main/static/logo.svg" alt="SnailyCAD logo">
  </a>
</p>
<br/>
<p align="center">
  <img src="https://img.shields.io/github/license/SnailyCAD/snaily-cadv4?color=gr" alt="npm package">
  <a href="https://github.com/vitejs/vite/actions/workflows/ci.yml"><img src="https://github.com/SnailyCAD/snaily-cadv4/actions/workflows/test-builds-typecheck.yml/badge.svg?event=push" alt="build status"></a>
  <a href="https://discord.gg/eGnrPqEH7U"><img src="https://img.shields.io/badge/chat-discord-blue?style=flat&logo=discord" alt="discord chat"></a>
</p>
<br/>

# SnailyCAD

> **This is the MySQL / MariaDB edition** of SnailyCADv4, with one-line installers for Ubuntu and
> Windows.
>
> **Docker** (the CAD and a MariaDB database in containers):
>
> ```bash
> curl -fsSL https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/main/scripts/installer/install-docker.sh | sudo bash
> ```
>
> **Ubuntu** (standalone: the CAD runs directly with Node.js, as a system service):
>
> ```bash
> curl -fsSL https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/main/scripts/installer/install-ubuntu.sh | sudo bash
> ```
>
> **Windows 10/11** (standalone, as a Windows service). In **PowerShell (Admin)**:
>
> ```powershell
> irm https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/main/scripts/installer/install.ps1 | iex
> ```
>
> or in **cmd**:
>
> ```bat
> powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/main/scripts/installer/install.ps1 | iex"
> ```
>
> Each starts a setup wizard in your browser that installs everything with buttons.
> See [docs/one-line-install.md](docs/one-line-install.md), [docs/install-docker.md](docs/install-docker.md)
> and [MYSQL-PORT.md](MYSQL-PORT.md).
>
> **Documentation:** https://snaily-doc.opslabsystems.cloud

## What's different from the original SnailyCAD

- **MySQL 8 / MariaDB 10.6+** instead of PostgreSQL, with a converter for existing PostgreSQL CADs
- **One-line installers** for Ubuntu, Docker and Windows, finished in a setup wizard in your browser
- **Built-in radio**: dispatchers and admins talk in the browser (dock on every page, pop-out,
  listen to many channels), units talk in FiveM with the `snailycad-radio` resource
  (positional audio, earpieces, pma-voice / SaltyChat / TokoVOIP / mumble-voip) —
  [docs/radio](docs/radio/README.md)
- **Login page notice** admins write themselves, instead of the link to snailycad.org
- **FiveM scripts** (`sna-call911`, `sna-sync`, ...): players are signed in by their linked
  Discord / Steam account, no API tokens to paste; still work with the original SnailyCAD —
  [docs/integrations/fivem-integrations.md](docs/integrations/fivem-integrations.md)
- **Coming by 15 October 2026:** FiveM framework integration (ESX, QBCore, Qbox)

Full list: [Updates — October 2026](https://snaily-doc.opslabsystems.cloud/docs/features/updates-october-2026)

💻 An open source Computer Aided Dispatch (CAD) for FiveM,
this is a web based integration for communities who love police roleplaying and dispatching. Optional Discord and FiveM integrations included.

<a href="https://discord.gg/eGnrPqEH7U">
  <img src="https://invite.casperiv.dev?inviteCode=eGnrPqEH7U&locale=en" />
</a>

## Links

- [Documentation](https://snaily-doc.opslabsystems.cloud/docs/getting-started)
- [Features List](https://snaily-doc.opslabsystems.cloud/docs/features)
- [Bugs reports & Feature requests](https://github.com/EWANZO101/snailycad-mysql/issues)
- [Contributing](./.github/CONTRIBUTING.md)

## Sponsors

- [Legacy](https://github.com/Legacy-TacticalGamingInteractive)
- [Local9](https://github.com/Local9)
- [jxckUK](https://github.com/jxckUK)
- [Creizy](https://github.com/Creizy)
- [Whitigol](https://github.com/whitigol)
- [LazyCalypso](https://github.com/LazyCalypso)
- [Northern524](https://github.com/Northern524)
- [Sharki](https://github.com/subtosharki)
- [GamingFlamin](https://github.com/GamingFlamin)
- [Zachary Hartman](https://github.com/zahrtman2006)
- [runesasia](https://github.com/runesasia)

## License

[MIT](./LICENSE)

## Archived versions

_A list of previous (archived) versions of SnailyCAD. This list is here so people can view older versions if needed._

- [SnailyCADv3](https://github.com/casperiv0/snaily-cadv3)
- [SnailyCADv2](https://github.com/casperiv0/snaily-cadv2)
- [SnailyCAD](https://github.com/casperiv0/snaily-cad)

---

_All stars/forks are appreciated ⚡. Made with ❤️ and TypeScript!_
