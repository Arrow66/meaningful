# Meaningful

Meaningful is a browser extension that shows definitions for selected words. When text is selected, each word receives a light blue highlight and rainbow underline; clicking a highlighted word opens a small definition tooltip with a close button and a Learn more action.

Use the Meaningful toolbar button to pause the extension temporarily for the current website or turn it off for that website until you enable it again.

## Development

The TypeScript source lives in `src/`. The build script bundles it into the loadable runtime files in `extension/`, then copies that folder into `.output/`.

Install dependencies:

```sh
npm ci
```

You can also use the Makefile shortcuts:

```sh
make install
make typecheck
make package-chrome
```

Type-check the source:

```sh
npm run typecheck
```

Create a production Chrome/Chromium build:

```sh
npm run build
```

Create a Chrome Web Store upload package:

```sh
npm run package:chrome
```

The upload zip is written to `.output/meaningful-chrome-mv3.zip`.

Create a Firefox build:

```sh
npm run build:firefox
```

## Load In Chrome

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select `.output/chrome-mv3`.

For quick testing without building, you can also load the `extension/` folder directly.

## Manual Test Checklist

- Select one word and confirm it receives a rainbow underline without opening a definition automatically.
- Select a sentence or paragraph and confirm words receive light blue highlights and rainbow underlines.
- Hover a highlighted word and confirm the highlight becomes slightly darker.
- Click a highlighted word and confirm its definition appears.
- Click `x` and confirm only the tooltip closes; highlights remain.
- Click Learn more and confirm a detailed lookup opens in a new tab.
- Open the Meaningful toolbar popup and confirm temporary pause stops highlights and definitions on the current website.
- Turn off Enabled on this site and confirm the extension stays off only for that website until it is enabled again.
- Open another website and confirm its preference is independent.

## Chrome Web Store Release Checklist

1. Run `npm run typecheck`.
2. Run `npm run package:chrome`.
3. Open `chrome://extensions`, enable Developer mode, and load `.output/chrome-mv3`.
4. Complete the manual test checklist above.
5. Upload `.output/meaningful-chrome-mv3.zip` in the Chrome Web Store dashboard.
6. Use the permission and privacy disclosure notes from `STORE_LISTING.md`.

## GitHub Actions

The repository includes two workflows:

- `CI` runs on pushes, pull requests, and manual dispatch. It installs dependencies, type-checks, packages the Chrome extension, and uploads `.output/meaningful-chrome-mv3.zip` as an artifact.
- `Publish Chrome Extension` runs manually from GitHub Actions and publishes the package to the Chrome Web Store.

To publish from GitHub, add these repository or environment secrets:

- `CHROME_EXTENSION_ID`
- `CHROME_CLIENT_ID`
- `CHROME_CLIENT_SECRET`
- `CHROME_REFRESH_TOKEN`

The publish workflow uses the `chrome-web-store` environment so you can add GitHub environment protection before submitting a release.

## Performance Notes

- The content script only reacts after mouse or keyboard selection actions.
- Editable fields are ignored so normal typing stays untouched.
- Very large selections are skipped instead of wrapping hundreds of nodes.
- Definition results are cached in the background worker to reduce repeated network calls.
