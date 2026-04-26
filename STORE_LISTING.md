# Chrome Web Store Listing Draft

## Extension Name

Meaningful

## Short Description

Highlight selected words and click them to see quick definitions while you read.

## Detailed Description

Meaningful helps you understand words without leaving the page you are reading. Select text to highlight each word in light blue with a rainbow underline, then click any highlighted word to open a compact definition tooltip.

Definitions are fetched only when you request them. If a dictionary result is unavailable, Meaningful offers a Learn more action so you can search for additional context.

You can use the Meaningful toolbar button to pause the extension temporarily for the current website or remember that Meaningful should stay off for that website until you enable it again. Preferences are independent for each website.

## Single Purpose Statement

Meaningful provides quick word definitions for text selected by the user on webpages.

## Permission Justifications

### Host Permission: `<all_urls>`

Meaningful needs access to webpages so it can detect user text selections, add temporary light blue highlights to selected words, and show the definition tooltip near the selected text. The extension only reacts to mouse or keyboard selection events and does not run on editable fields.

### Host Permission: `https://api.dictionaryapi.dev/*`

Meaningful uses Free Dictionary API to fetch definitions for words that the user selects or clicks. Requests are made only for lookup words requested by the user.

### Permission: `storage`

Meaningful uses extension storage to remember per-website enabled, disabled, and temporary pause preferences.

### Permission: `activeTab`

Meaningful uses active tab access when the toolbar popup is opened so it can identify the current website and apply the user's preference only to that website.

## Privacy Disclosure Draft

Meaningful does not require an account and does not collect, sell, or share personal information for advertising. When you request a definition, the selected word is sent to Free Dictionary API to retrieve a definition. Definition results may be cached locally in the extension background worker during the browser session to reduce repeated lookups. Your per-website enabled, disabled, or temporary pause preferences are stored locally by the browser.

Meaningful does not collect browsing history, page contents, or keystrokes. It only reads selected text on the active webpage to provide the requested definition and temporary highlight UI.

## Suggested Category

Productivity

## Suggested Support Notes

Todo
