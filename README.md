# Factorio Forge

<p align="center">
  <img src="src/icon/Icon500X500.png" alt="Factorio Forge Logo" width="140" />
</p>

<p align="center">
  <strong>Desktop launcher for Factorio with fully isolated instances.</strong><br/>
  Manage mods, saves, and versions without conflicts.
</p>

<p align="center">
  <a href="https://github.com/Mrzmiless/factorio-forge/releases/latest"><img src="https://img.shields.io/github/v/release/Mrzmiless/factorio-forge?style=for-the-badge" alt="Latest Release"></a>
  <a href="https://github.com/Mrzmiless/factorio-forge"><img src="https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge" alt="MIT License"></a>
  <a href="https://github.com/Mrzmiless/factorio-forge/stargazers"><img src="https://img.shields.io/github/stars/Mrzmiless/factorio-forge?style=for-the-badge" alt="GitHub Stars"></a>
</p>

## Overview

Factorio Forge is an Electron desktop app that lets you run multiple Factorio setups in parallel, each with its own:

- Mods
- Saves
- Config
- Game version

No overlap, no broken saves, no modpack conflicts.

## Quick Links

| Card | Link |
|---|---|
| 🌐 **Website** | [Open official site](https://mrzmiless.github.io/factorio-forge/) |
| ⬇️ **Download** | [Latest release](https://github.com/Mrzmiless/factorio-forge/releases/latest) |
| 💻 **Source Code** | [GitHub repository](https://github.com/Mrzmiless/factorio-forge) |
| 🐞 **Report Issues** | [Issue tracker](https://github.com/Mrzmiless/factorio-forge/issues) |

## Features

- ⚙️ Automatic detection of existing Factorio installation
- 📦 Automatic vanilla instance creation on first launch
- 🧩 Create, rename, remove, and open instance folders
- 🛡️ Per-instance isolation for mods and saves
- 🗂️ Choose different game versions per instance
- 🚀 Launch using `--config-path` for clean separation
- 🖥️ Custom UI with sidebar, modals, and title bar controls

## How Isolation Works

Factorio Forge launches the game with a custom config path:

```bash
factorio --config-path=<instance-folder>
```

Each instance behaves like a standalone game environment.

## Tech Stack

- Electron
- TypeScript
- Node.js
- Vite + React (renderer)

## Development

```bash
npm install
npm run build
npm start
```

For watch mode while coding:

```bash
npm run dev
```

## Project Structure

```text
src/
  core/
  main/
  renderer/
  renderer-react/
docs/
```

## Contributing

Contributions are welcome. 🚀

1. Fork the repository
2. Create a branch: `git checkout -b codex/your-feature-name`
3. Commit your changes
4. Push your branch
5. Open a Pull Request

Please keep PRs focused and include a clear description of what changed.

## Disclaimer

Factorio Forge is an independent project and is not affiliated with or endorsed by Wube Software.
