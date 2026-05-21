# Smart Element

**Smart Element** is a browser extension for Element Web / Matrix workflows. It combines four tools into one extension:

1. an image-gallery sender and gallery renderer for Matrix rooms,
2. a Mattermost-to-Matrix importer,
3. a Mattermost export helper,
4. a mobile-friendly Element Web companion with improved space, chat, and thread navigation.

The extension is designed for users who work heavily in Element Web and want a faster, more touch-friendly, media-friendly interface without replacing Element itself. All features are optional and can be enabled or disabled independently.

---

## Highlights

### A more usable Element Web interface

Smart Element adds a mobile-oriented control layer above Element Web. It makes spaces, subspaces, home/start-page chats, room lists, and threads easier to access on small or touch-driven screens.

Key UI improvements include:

- a large mobile-friendly space chooser,
- breadcrumb navigation through nested Matrix spaces,
- filter chats to spaces only; excludes subspaces - as used to from Mattermost and other chat services,
- a Startseite/Home chat list collected from Element's native start-page room list,
- mobile-friendly foll-screen chat and thread view,
- visual separation between joined and not-yet-joined spaces,
- configurable A-Z/user sorting,
- unread indicators on room, space, and action buttons,

### Image galleries for Matrix rooms

The gallery module improves image handling in Element Web:

- floating gallery send button,
- paste and drag-and-drop image collection,
- queued thumbnails before sending,
- optional figure captions,
- grouped gallery rendering after upload,
- horizontally scrollable gallery strips,
- keyboard navigation in the full-screen viewer,
- white background for transparent images,

### Mattermost import and export workflow

The Mattermost tools are intended for migrating or archiving Mattermost content into Matrix / Element workflows.

Exporter features include:

- browser-side helper for Mattermost export pages,
- export/download UI integration,
- configurable date range support where available,
- shared enable/disable state with the importer.
- include emojis and threads
- standalone website to browse and view Mattermost teams, channels and chats

Importer features include:

- Mattermost export selection,
- team/channel selection before upload,
- import progress display,
- duplicate-check workflow,
- thread import handling,
- emoji text-code conversion where supported,

### Thread-view improvements

Smart Element includes a thread-view enhancement layer for Element Web:

- thread messages are inline with the other messages

---

## Feature switches

Smart Element has four independent feature switches:

| Switch | Effect |
|---|---|
| **Image gallery** | Enables/disables the Matrix image gallery sender and renderer. |
| **Mattermost importer and exporter** | Enables/disables both Mattermost import and export tools. |
| **Matrix mobile layout** | Enables/disables all mobile companion UI and restores the vanilla Element page behavior when disabled. |
| **Thread view** | Enables/disables the Smart Element thread-view enhancement. |

The switches are available in several places:

- the gallery settings menu,
- the mobile space selector settings menu,
- the Mattermost importer settings menu,
- the browser extension options page.

If all in-page features are disabled, Smart Element shows an alert explaining that the features can still be re-enabled from the browser extension settings/options page.

---

## Supported pages

The extension is primarily targeted at Element Web instances, especially:

- `https://app.element.io/`
- `https://matrix.helmholtz.cloud/`
- other Element-style deployments covered by the manifest host permissions

The Mattermost exporter content script can run on broader HTTP/HTTPS pages because export pages and locally hosted static Mattermost exports may use different hosts, local web servers, or intranet addresses.

---

## Installation overview

The release package contains the extension source as an unpacked browser-extension folder. Chromium browsers load that folder directly. Firefox Desktop can load it temporarily from `about:debugging`. Firefox for Android Nightly can be tested either from an XPI package or through `web-ext`/ADB.

After installing or reloading the extension, refresh already-open Element or Mattermost tabs so that the content scripts are injected again.

---

## Install in Google Chrome

1. Download and unzip the Smart Element release ZIP.
2. Open Chrome.
3. Go to `chrome://extensions`.
4. Enable **Developer mode** using the switch in the upper-right corner.
5. Click **Load unpacked**.
6. Select the unzipped Smart Element extension folder, the folder that contains `manifest.json`.
7. Open or reload your Element Web tab.
8. Open the browser extension menu and optionally pin **Smart Element - by Thomas Kluge** to the toolbar.

To update after replacing files:

1. Go back to `chrome://extensions`.
2. Click the reload icon on the Smart Element extension card.
3. Reload any already-open Element/Mattermost tabs.

Official Chrome reference: <https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked>

---

## Install in Microsoft Edge

1. Download and unzip the Smart Element release ZIP.
2. Open Edge.
3. Go to `edge://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the unzipped Smart Element folder containing `manifest.json`.
7. Open or reload your Element Web tab.
8. Optional: pin the extension from the Edge extensions menu.

To update after replacing files:

1. Go to `edge://extensions`.
2. Click **Reload** on the Smart Element card.
3. Refresh already-open Element/Mattermost pages.

Official Edge reference: <https://learn.microsoft.com/en-us/microsoft-edge/extensions/getting-started/extension-sideloading>

---

## Install temporarily in Firefox Desktop

Firefox needs the Firefox-specific manifest variant. Do **not** load the Chrome/Edge ZIP directly in Firefox: Firefox currently rejects `background.service_worker` and expects a background script entry such as `"scripts": ["background.js"]`.

Use one of these Firefox packages instead:

- `smart-element_v*_firefox.xpi` for normal Firefox testing/installing.
- `smart-element_v*_firefox_unpacked.zip` if you specifically want to load an unpacked temporary add-on from `about:debugging`.

Temporary unpacked install:

1. Download and unzip `smart-element_v*_firefox_unpacked.zip`.
2. Open Firefox.
3. Go to `about:debugging`.
4. Click **This Firefox**.
5. Click **Load Temporary Add-on...**.
6. Select `manifest.json` from the unzipped Firefox-specific folder.
7. Open or reload your Element Web tab.

Important details:

- Temporary add-ons are removed when Firefox restarts.
- To reload changes, use the **Reload** button for the temporary extension in `about:debugging`.
- If a feature does not appear, reload the Element tab after reloading the extension.
- Chrome/Edge and Firefox packages intentionally use different `background` manifest blocks.

Official Firefox reference: <https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension#installing>

---

## Install or test in Firefox for Android Nightly

Firefox for Android has a different extension-development workflow from desktop Firefox. Smart Element is primarily a content-script extension for Element Web, but Android support should be treated as experimental because Firefox for Android does not always support the same extension APIs and UI surfaces as desktop Firefox.

There are two practical test routes.

### Route A: install an XPI from file in Firefox Nightly

Use this route if your Firefox Nightly build shows **Install add-on from file** after enabling its debug menu.

1. Install **Firefox Nightly for Developers** on Android.
2. Copy the Smart Element `.xpi` file to the Android device, for example into `Downloads`.
3. Open Firefox Nightly.
4. Open the three-dot menu.
5. Open **Settings**.
6. Open **About Firefox Nightly**.
7. Tap the Firefox Nightly logo five times until the debug menu is enabled.
8. Go back to **Settings**.
9. Use **Install add-on from file**.
10. Select the Smart Element `.xpi` file.
11. Open your Element Web instance in Firefox Nightly and reload the page.

If **Install add-on from file** is not visible, use Route B.

### Route B: run from source with `web-ext` and ADB

Use this route for development, debugging, and cases where the Nightly file installer is not available.

One-time Android setup:

1. Open Android **Settings**.
2. Open **About phone** or the device-specific equivalent.
3. Tap **Build number** repeatedly, usually seven times, until Android says developer options are enabled.
4. Go back to **Settings**.
5. Open **Developer options**.
6. Enable **USB debugging**.
7. Connect the device to your computer and allow the USB debugging prompt.
8. In Firefox Nightly on Android, enable **Remote debugging via USB** in Firefox settings if the option is present.

Computer setup:

1. Install Node.js/npm.
2. Install Mozilla's web-ext tool:

   ```bash
   npm install --global web-ext
   ```

3. Install Android Platform Tools so that `adb` is available.
4. Check the device connection:

   ```bash
   adb devices
   ```

Run Smart Element on Android Nightly:

```bash
cd /path/to/smart-element
web-ext run -t firefox-android --adb-device <device-id> --firefox-apk org.mozilla.fenix
```

Replace `<device-id>` with the device ID shown by `adb devices`.

Official Mozilla Android extension-development reference: <https://extensionworkshop.com/documentation/develop/developing-extensions-for-firefox-for-android/>

---

## Basic usage

### Opening the Smart Element settings

You can open the shared settings from:

- the browser extension icon/options page,
- the gallery dialog,
- the mobile space selector,
- the Mattermost importer dialog.

The settings are stored in browser extension storage and apply across the combined modules.

### Using the mobile space selector

1. Open Element Web.
2. Use the Smart Element mobile control to open the space selector.
3. Select **Startseite/Home** to show chats from Element's native home/start-page list.
4. Select a space to show its subspaces.
5. Select **Chats in this space** to show only chats directly inside the current space.
6. Select a chat to open it in Element.
7. Use breadcrumbs to go back to parent spaces.

When you select a subspace, Smart Element aborts pending parent-panel refreshes so the parent list does not redraw over the child selection.

### Using the gallery sender

1. Open an Element room.
2. Open the Smart Element gallery dialog.
3. Add images by paste or drag-and-drop.
4. Remove queued images with the thumbnail controls if needed.
5. Add captions if desired.
6. Send the gallery.
7. Click rendered gallery images to open the fullscreen viewer.

Element's own space drag-and-drop sorting is ignored by the gallery drop handler, so resorting spaces should not open the gallery overlay.

### Using the Mattermost importer

1. Open the Mattermost importer dialog in Element.
2. Select or point Smart Element to a local/static Mattermost export.
3. Select the team, channel, or direct-message export to import.
4. Review warnings, especially duplicate-check and scroll-to-top warnings.
5. Start the import.
6. Watch the progress bar and cancel if required.

For large imports, keep the browser tab active and avoid navigating away until the import is finished.

---

## Development notes

### Main files

| File | Purpose |
|---|---|
| `manifest.json` | Browser extension manifest. |
| `combined-settings.js` | Shared feature-toggle state and settings dialog. |
| `gallery-content.js` | Matrix gallery sender and renderer. |
| `gallery-styles.css` | Gallery UI styling. |
| `matrix-mobile-content.js` | Mobile Element companion, space/chat/thread navigation, unread indicators. |
| `matrix-mobile-styles.css` | Mobile companion UI styling. |
| `mattermost-importer-content.js` | Mattermost import workflow for Element. |
| `mattermost-importer-styles.css` | Importer UI styling. |
| `mattermost-exporter-content.js` | Mattermost export helper. |
| `mattermost-exporter-content.css` | Exporter UI styling. |
| `mg-page-bridge.js` | Matrix page bridge used by the gallery module. |
| `mmi-page-bridge.js` | Matrix page bridge used by the importer module. |
| `options.html`, `options.css`, `options.js` | Browser extension options page. |
| `background.js` | Background worker for extension-level fetch support. |

### Validation commands

From the extension folder:

```bash
node --check background.js
node --check combined-settings.js
node --check gallery-content.js
node --check matrix-mobile-content.js
node --check mattermost-importer-content.js
node --check mattermost-exporter-content.js
```

For ZIP validation:

```bash
unzip -t smart-element.zip
```

### Packaging as Chromium ZIP

Chromium browsers expect an unpacked folder containing `manifest.json`.

```bash
zip -r smart-element.zip smart-element
```

Then unzip the package and load the extracted folder through **Load unpacked**.

### Packaging as Firefox XPI

Firefox XPI packages must have `manifest.json` at the archive root, not inside an additional parent folder. They must also use the Firefox-specific background entry:

```json
"background": {
  "scripts": ["background.js"],
  "preferred_environment": ["document"]
}
```

Do not package the Chrome/Edge manifest as a Firefox XPI, because that manifest contains:

```json
"background": {
  "service_worker": "background.js"
}
```

From inside the Firefox-specific extension folder:

```bash
zip -r ../smart-element.xpi .
```

---

## Permissions and privacy

Smart Element stores its settings in browser extension storage. It does not require an external server for its core UI features.

The extension uses broad host permissions because:

- Element Web instances may run on different domains,
- Matrix media URLs can be hosted under Matrix API paths,
- Mattermost exports may be opened from local or intranet URLs,
- the exporter/importer may need to read static export assets from user-selected locations.

Treat the extension as a local productivity/development tool. Review `manifest.json` before installation if deploying it in a managed environment.

---



### Firefox-specific package note

The Firefox/Firefox Android `.xpi` uses a Firefox-specific manifest variant with a background event page (`background.scripts`) instead of a Chromium service worker. Firefox for Android does not support extension background service workers; using the Firefox-specific XPI avoids the misleading “damaged/corrupt add-on” failure that can occur when the Chromium manifest is packaged as an XPI.

## Known limitations

- Element Web is a React application with frequently changing class names and DOM structure. Smart Element uses defensive DOM matching, but Element updates can still require patches.
- Reload the Element tab after installing, updating, or reloading the extension.
- Firefox Desktop temporary installation is not persistent across browser restarts.
- Firefox for Android Nightly support is experimental. Some desktop extension APIs and background-service-worker behavior may differ on Android.
- The Mattermost import workflow depends on the shape and accessibility of the export data.
- Very large imports can be slow because they drive Element's web UI directly.

---

## Troubleshooting

### The extension is installed but nothing appears

1. Reload the Element tab.
2. Open the browser extension options page.
3. Confirm that at least one feature switch is enabled.
4. Check that the page URL matches the manifest host permissions.
5. Open DevTools and check the console for extension errors.

### All in-page UI is disabled

Open the browser extension options page and re-enable the desired Smart Element modules. The options page remains available even if every in-page switch is disabled.

### Chrome/Edge says the manifest cannot be found

Make sure you selected the extracted folder containing `manifest.json`, not the ZIP file itself and not a parent directory.

### Firefox removes the extension after restart

That is expected for temporary installation through `about:debugging`. Reload it from `about:debugging` or use a signed/persistent installation route.

### Firefox Android Nightly does not show “Install add-on from file”

Use the `web-ext`/ADB workflow described above. The file-install option can vary by Nightly version, device, and build channel.

### A subspace appears under the wrong parent

Reload Element and use the latest Smart Element build. This version aborts parent refreshes once a subspace is selected and derives hierarchy from Element's nested space-rail DOM where possible.

---

## License / distribution

Smart Element is distributed under the MIT License, with one explicit naming exception:

- the software code, documentation, and extension assets are licensed under the MIT License;
- the name **"Smart Element"** is excluded from the MIT license grant and remains copyright © Thomas Kluge, 2026.

See [`LICENSE`](LICENSE) for the complete license text and naming exception.
