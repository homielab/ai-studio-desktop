# Google AI Studio and Gemini - instructions for agents

This repository contains an unofficial Electron desktop client for Google AI Studio and Gemini. It provides a standalone window, app-level controls, and packaged builds for Windows, macOS, and Linux. It is not affiliated with or endorsed by Google.

## Start every session here
1. Read `README.md` for the app's behavior, supported platforms, and user-facing conventions.
2. Read `package.json` and the relevant files under `src/` before making changes. Follow the existing Electron and CommonJS patterns.
3. Keep changes scoped to the requested behavior. Update documentation when user-visible behavior or setup instructions change.

## Non-negotiables
- Preserve the project's unofficial status. Do not imply endorsement or affiliation with Google.
- Do not commit credentials, signing secrets, or local environment files. Keep release configuration and secrets out of source changes.
- Preserve existing platform behavior and security boundaries in the Electron app. Avoid weakening renderer isolation, navigation restrictions, or permission checks.
- Use the scripts defined in `package.json`; do not invent build or release commands. `npm start` runs the app and `npm run build` packages it.
- Do not publish or release builds unless explicitly requested.

## Running and looking at the app
- Run `npm start` to launch the desktop app during development.
- For packaging, use `npm run build`; output is written to `dist/`.
- Check the relevant platform behavior when changing shortcuts, window lifecycle, tray handling, or build configuration.
