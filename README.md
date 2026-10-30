# FlopGPT

A parody AI chat app that plays back a script. Made for skits and demos.

App concept inspired by [a tiktok by @jackyroadstudios](https://www.tiktok.com/t/ZPLDLKTYY/), but the default script is pulled directly from his skit. Creativity credits to him.

It's a desktop app (Tauri) for Mac, Windows and Linux, and it also serves the demo to phones on the same wifi. Or try it in your browser at **[flopgpt.vercel.app](https://flopgpt.vercel.app)**.

<!-- This video will not render on GitHub -->
<video src="docs/demo.mp4" width="300" controls></video>

<!-- This link will render as a video on GitHub -->
https://github.com/user-attachments/assets/ccc0058f-19aa-4b86-bd81-6f368e81a5c3

## How it plays

1. Type anything and press Enter (Shift+Enter for a new line).
2. The next scripted response plays: a few short "thinking" blurbs, each shown for its own length of time, then the answer streams in.
3. The blurbs collapse to "Thought for Ns". Click that line to see them all.

**Attachments:** the **+** button adds up to 10 photos, videos, audio files, PDFs or text files. You can also paste an image or drop files on the page. They can be sent with or without text, show up in the thread (click an image to enlarge it), and never leave the browser.

**Performer shortcuts:**

- **Type the scripted prompt:** if the next response has a `prompt`, press **Tab** in the empty box, or on a phone **long-press the send button**. The prompt types itself out; then send it.
- **Send the prompt instantly:** press Enter or tap send with the box empty.
- **Start over:** **New chat** in the sidebar, or **Restart script** in **Settings** (the sliders icon at the top right), goes back to the first response.
- After the last response, every prompt gets the `fallback` message.

## Download

Get the latest version from the **[Releases page](https://github.com/cocowmn/FlopGPT/releases/latest)**. Under **Assets**, pick the file for your computer:

| Your computer | Download |
|---|---|
| **Mac with Apple Silicon** (M1, M2, M3, M4 — most Macs from late 2020 on) | `FlopGPT_<version>_macOS-Apple-Silicon.dmg` |
| **Mac with Intel** (older Macs) | `FlopGPT_<version>_macOS-Intel.dmg` |
| **Windows** | `FlopGPT_<version>_Windows-setup.exe` |
| **Linux** | `FlopGPT_<version>_Linux.AppImage` works on most distros. Use `.deb` for Ubuntu/Debian or `.rpm` for Fedora. |

Not sure which Mac you have? Click the Apple menu, then **About This Mac**. If it lists a **Chip**, pick Apple Silicon. If it lists a **Processor**, pick Intel.

The app isn't signed, so your computer warns you the first time you open it:

- **Mac:** if macOS says it can't verify FlopGPT, open **System Settings > Privacy & Security**, scroll down, and click **Open Anyway** next to the FlopGPT message.
- **Windows:** if SmartScreen says "Windows protected your PC", click **More info**, then **Run anyway**.

## Phones

The app runs a small web server so phones on the same wifi can open the demo. **Settings > Phone server** shows:

- whether it's running, with a Start/Stop button, and its port (8787 by default, or the next free one; you can change it);
- the address to open on a phone, with a QR code to scan;
- how many devices are connected and how many requests they've made;
- **Let phones change the config** (on by default): imports and edits made on a phone are saved in the app. Anyone on the wifi can then change the config, so turn it off on shared networks.

Every device uses the app's config and follows changes live. A device in the middle of a chat waits for the next **New chat** or **Restart script**, so a performance isn't interrupted.

If macOS asks whether FlopGPT may accept incoming network connections, allow it, or phones can't connect. Guest wifi networks often block devices from reaching each other.

## Customization

A demo is one JSON config: the branding, the scripted responses, and the old conversations in the sidebar. Change it in the app, or write a file and import it.

### Changing the config

In **Settings > Config**:

- **Edit** opens an editor. The **Form** tab has fields for the settings, each response and the sidebar chats; the **JSON** tab shows the whole config, for anything the form doesn't cover. **Save & restart** saves and starts the chat over.
- **Import...** loads a config file, as does dropping a `.json` file on the page (other dropped files are attached to the next message). An older script-only or threads-only file replaces just that part.
- **Export...** saves the config as a file.

**Reset to defaults**, at the bottom of Settings, goes back to the built-in config.

The desktop app saves the config in its app data folder (on a Mac, `~/Library/Application Support/com.cocowmn.flopgpt/config.json`). Phones save through the app; the browser-only version saves in the browser.

### Logo

**Settings > Logo > Choose image...** replaces the default sparkle with your own image: in the sidebar, the empty-chat greeting, the mark at the end of each reply, and the browser tab. A square image with a transparent background looks best. The image is stored in the config, so it exports with it. **Reset** brings the sparkle back.

In a config file, `"logo"` can also be a URL or data URI or, if you build the app yourself, the name of a file in `ui/public/` (`"logo": "my-logo.png"`).

### Thinking spinners

While the blurbs show, an animated spinner in the accent color sits beside them. Set `"spinner"` in the config to choose which:

- `"random"` (the default): a different one for each response;
- `"none"`: no spinner;
- one name, like `"3-dots-bounce"`;
- a list of names to pick from, like `["3-dots-fade", "3-dots-rotate"]`.

The names are `3-dots-bounce`, `3-dots-fade`, `3-dots-move`, `3-dots-rotate`, `3-dots-scale` and `3-dots-scale-middle`. If you build the app yourself, you can add one by pasting SVG markup into `ui/src/lib/spinners.ts`. Any `fill` on its root `<svg>` is ignored, so it takes the accent color.

### Config format

```json
{
  "appName": "Nova",
  "modelName": "Nova 2 Pro",
  "userName": "Alex",
  "greeting": "What can I help you with today?",
  "placeholder": "Message Nova",
  "disclaimer": "Nova can make mistakes.",
  "accent": "#5b5bd6",
  "logo": "optional-logo.png",
  "spinner": "random",

  "defaultPendingSeconds": 2.5,
  "streamResponse": true,
  "charsPerSecond": 90,
  "typingCharsPerSecond": 28,
  "thoughtLabel": "Thought for {s}s",
  "fallback": "Shown after the script runs out.",

  "responses": [
    {
      "prompt": "Optional. Tab / empty-Enter will type this.",
      "pending": [
        "Reading your message",
        { "text": "Doing something dramatic", "seconds": 4 },
        "Almost there"
      ],
      "response": "The final answer. **Markdown** is supported."
    }
  ],

  "threads": [
    { "title": "Weekend trip packing list", "group": "Today" },
    { "title": "Explain quantum computing simply" },
    { "title": "Fix my sourdough starter", "group": "Yesterday" }
  ]
}
```

Everything except `responses` is optional.

| Field | Where | Meaning |
| --- | --- | --- |
| `appName`, `modelName`, `userName`, `greeting`, `placeholder`, `disclaimer`, `accent` | top level | Branding. `accent` also colors the thinking spinners. |
| `logo` | top level | Logo image: a path, URL or data URI (see [Logo](#logo)). |
| `spinner` | top level | `"random"` (default), `"none"`, a spinner name, or a list of names. |
| `defaultPendingSeconds` | top level or response | How long each blurb shows unless it sets its own `seconds` (default 2.5). A response's value overrides the top-level one. |
| `streamResponse` | top level | Typewriter streaming on or off (default on). In a response, the same switch is called `stream`. |
| `charsPerSecond` | top level or response | Streaming speed (default 90). |
| `typingCharsPerSecond` | top level | How fast Tab or long-press types a `prompt` (default 28). |
| `thoughtLabel` | top level | The label the blurbs collapse to (default `Thought for {s}s`; `{s}` is the seconds). |
| `fallback` | top level | The answer to every prompt after the last response: a string, or a response like those in `responses`. |
| `prompt` | response | A line the performer can type with Tab or send with Enter on an empty box. |
| `pending` | response | The blurbs, shown in order. Each is a string or `{ "text", "seconds" }` (`thinking` also works). |
| `seconds` | pending item | How long that blurb shows. |
| `response` | response | The answer, in Markdown (`text` also works). A plain string in `responses` is an answer with no blurbs. |
| `threads` | top level | Old conversations in the sidebar, as `{ "title", "group" }` or plain strings. `group` starts a heading that the following chats share until the next `group`. They're for show: clicking one only highlights it, though the sidebar search does filter them. |

Markdown supported in responses: paragraphs, `#` headings, `-` and `1.` lists, `>` quotes, fenced code blocks, `` `inline code` ``, `**bold**`, `*italic*`, `[links](https://...)`, `---`.

## Browser-only version

The same page without the app, as at [flopgpt.vercel.app](https://flopgpt.vercel.app). It keeps its config in the browser's localStorage, so each browser has its own; use **Export** and **Import** to move it. Other tabs in the same browser follow changes, but there's no phone server and no syncing between devices.

```sh
npm run build:standalone   # static files in dist-web/
npm run dev:standalone     # try it at http://localhost:5173 without the app
```

`dist-web/` is a static site you can host anywhere; each release also includes it as `FlopGPT_<version>_Web.zip`. To host it on Vercel with no deployment config in this repo, either:

- **Build locally and upload the result.** Once, run `vercel link` in the repo root, set the project's **Build Command** to `npm run build:standalone` and **Output Directory** to `dist-web` (in the prompts or the dashboard), and fetch those settings:

  ```sh
  vercel pull --yes --environment production
  ```

  Then, to deploy:

  ```sh
  vercel build --prod && vercel deploy --prebuilt --prod
  ```

  This uploads only the built site (`.vercel/output/`, about 130 KB). Don't run a plain `vercel` or `vercel deploy` from the repo root: the CLI ignores `.gitignore` and would upload `src-tauri/target/`, several GB of Rust build output. `.vercel/` is gitignored. Run `vercel pull` again after changing the settings in the dashboard.
- **Or connect the repo** in the Vercel dashboard with the same two settings, and Vercel builds on every push.

## Building

Needs Node.js, Rust 1.90 or newer (`rustup update stable`) and, on a Mac, the Xcode command line tools.

```sh
npm install
npm run dev      # run it while working on it (the window reloads as you edit ui/)
npm run build    # bundles for the computer you run it on, in src-tauri/target/release/bundle/
npm run check    # type-check the page
```

`npm run build` makes the installers for the OS it runs on: a .app and .dmg on a Mac, an .msi and NSIS installer on Windows, and a .deb, .rpm and AppImage on Linux. To build all of them, `npm run release -- patch` (or `minor`, `major`, or a version) bumps the version and pushes a tag; the **Release** workflow then builds every platform and attaches the files to a draft GitHub release. See [docs/RELEASING.md](docs/RELEASING.md).

The page (`ui/`) is a Svelte 5 + TypeScript app that Vite builds into `dist/`, which the app shows and serves to phones. It reads and saves its config through the app; the [browser-only version](#browser-only-version) doesn't.

While `npm run dev` runs, phones get the page as it was built when dev started (restart dev to update them). `npm run dev:web` serves just the page at `http://localhost:5173` and passes its config calls to an app already running on port 8787, so a browser there acts like a phone.

## Files

- `ui/src/App.svelte` - the page; `ui/src/components/` - its parts (sidebar, chat, composer, settings and the config editor)
- `ui/src/lib/stores/` - app state: the config and syncing it (`config.svelte.ts`), the chat playing the script (`chat.svelte.ts`), and UI state (`ui.svelte.ts`)
- `ui/src/lib/` - config parsing (`normalize.ts`), the Markdown renderer, and calls to the app or, in the browser-only build, localStorage (`backend.ts`)
- `ui/src/lib/spinners.ts` - the animated thinking spinners (add your own here)
- `ui/src/styles/global.css` - colors and shared styles; everything else is styled in its component
- `src-tauri/default-config.json` - the built-in config
- `src-tauri/src/server.rs` - the phone server and saved config; `src-tauri/src/lib.rs` - the commands the settings dialog calls
