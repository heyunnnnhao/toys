# Toys

Toys is a Windows desktop collection. Each toy has its own installer, version, window configuration, and permissions. All toys use the same React toolchain and release command.

## Run Work Cheer

Use Windows 11 x64 with Node.js 24 LTS, pnpm 11.25.0, the Rust stable MSVC toolchain, Microsoft C++ Build Tools with the Desktop development with C++ workload, and WebView2. The first Rust build and the first NSIS package need network access to fetch build dependencies. [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/)

Run these commands from the repository root.

```powershell
pnpm install --frozen-lockfile
pnpm check
pnpm dev work-cheer
pnpm package work-cheer
```

The development command opens the workday earnings dashboard in a Tauri window. Its native App menu opens settings for the schedule, monthly salary, annual bonus, and the reward for the date shown on the dashboard. The dashboard spreads the bonus across 12 months and divides each month's compensation across its Monday–Friday workdays. Press the backtick key to start the simulated clock from a local date and time or return to the real clock.

## Run Gold Miner

```powershell
pnpm dev gold-miner
pnpm package gold-miner
```

See [Gold Miner](apps/gold-miner/README.md) for controls, browser development, and asset credits. The desktop build uses its own save storage. The public checkout uses the game's built-in vector artwork. Local copies of the original Flash sprites are ignored by Git and can be loaded for personal use. [Asset credits](apps/gold-miner/public/assets/CREDITS.md)

## Architecture

| Location | Ownership |
| --- | --- |
| `apps/<toy>/src/` | The toy's React UI, styles, state, and business logic |
| `apps/<toy>/src-tauri/` | Its Windows identity, window settings, icon, and any native commands or permissions |
| `pnpm-workspace.yaml` and `pnpm-lock.yaml` | Shared dependency versions and a reproducible JS dependency graph |
| `Cargo.toml` and `Cargo.lock` | Shared Rust dependency versions, build output, and release profile |
| `scripts/toy.mjs` | Root command that selects the toy, runs Tauri, and collects its installer |
| `scripts/windows-bundle.json` | Release settings used by every toy |
| `artifacts/<toy>/<version>/` | Local release output, excluded from Git |

Vite builds each app into its own `dist/`. Tauri embeds those assets in the app's executable. WebView2 renders them on Windows using the installed Evergreen Runtime, which is shared across applications. The Windows shell stays small by default. Add a Tauri plugin only to the app that needs it, and grant only the required permissions to the relevant local window. [Tauri Vite integration](https://v2.tauri.app/start/frontend/vite/) · [Tauri capabilities](https://v2.tauri.app/security/capabilities/) · [Microsoft WebView2 distribution](https://learn.microsoft.com/microsoft-edge/webview2/concepts/distribution)

JS packages declare the dependencies they use with `catalog:` for centrally managed versions. Cargo crates can inherit dependency versions with `.workspace = true`. If two toys need the same code, put it in a small package under `packages/` and import it via `workspace:*`. Each toy should build without importing another app's source. [pnpm catalogs](https://pnpm.io/catalogs) · [Cargo workspaces](https://doc.rust-lang.org/cargo/reference/workspaces.html)

## Add a toy

1. Use `apps/work-cheer` as a reference and create `apps/<toy>`. Use a lowercase kebab-case directory name and a matching `@toys/<toy>` package name. Keep the `dev:web`, `build:web`, and `check` scripts.
2. Set its own Tauri `identifier`, distinct `productName`, Cargo package name, window title, and icon. Keep the identifier stable once published so installs and upgrades use the same identity. Tauri reads the release version from the app's `package.json`.
3. Assign a free loopback port in `build.devUrl` and match it in the dev CSP if HMR is enabled. Vite reads the port from `build.devUrl` and fails if it is already in use.
4. Run `pnpm install` and `cargo generate-lockfile` to update the workspace lockfiles. Run `pnpm check`, `pnpm dev <toy>`, and `pnpm package <toy>`.

## Windows packaging

`pnpm package <toy>` builds with the locked Cargo dependency graph for `x86_64-pc-windows-msvc`, applies the shared NSIS configuration, and copies the resulting `-setup.exe` to `artifacts/<toy>/<version>/`. It prints the installer size in MiB. Run package jobs sequentially in a checkout because they share Cargo output and NSIS staging directories. Use separate checkouts for parallel release jobs.

The installer is per-user. If WebView2 is already installed, the app can be installed and run offline. If it is missing, the installer fetches the WebView2 bootstrapper. An offline installer for a machine without WebView2 would need to include the runtime or receive it separately. [Tauri Windows installer options](https://v2.tauri.app/distribute/windows-installer/#webview2-installation-options)

Before public distribution, sign the Windows installer and validate it on a clean Windows target. For each release, verify installation, launch, the toy's primary interaction, and uninstallation. Track the installer size separately from the installed app size and any first-run runtime download. [Tauri Windows code signing](https://v2.tauri.app/distribute/sign/windows/)
