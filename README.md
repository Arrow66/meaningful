# Meaningful

Meaningful is a browser extension that shows definitions for selected words.
Use the Meaningful toolbar button to pause the extension temporarily for the current website or turn it off for that website until you enable it again.

<img width="909" height="520" alt="image" src="https://github.com/user-attachments/assets/5975cc31-e7f5-466e-a3d1-d9ac5994dcc2" />


## Development

The TypeScript source lives in `src/`. Take a look in to package.json and tsconfig.json for more details.

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


- The content script only reacts after mouse or keyboard selection actions.
- Editable fields are ignored so normal typing stays untouched.
- Very large selections are skipped instead of wrapping hundreds of nodes.
- Definition results are cached in the background worker to reduce repeated network calls.
