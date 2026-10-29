# FlopGPT

A parody AI chat app that plays back a script. Made for skits and demos.

App concept inspired by [a tiktok by @jackyroadstudios](https://www.tiktok.com/t/ZPLDLKTYY/), but the default script is pulled directly from his skit. Creativity credits to him.

It's a desktop app (Tauri). Open **FlopGPT** to run the demo on the computer; it also serves
the demo to phones on the same wifi.

<div style="display: grid; place-items: center;">
  <video src="docs/demo.mp4" width="50%" controls></video>
</div>

## Building

```sh
npm install
npm run dev      # run it while working on it (the window reloads as you edit ui/)
npm run build    # bundles for the computer you run it on, in src-tauri/target/release/bundle/
npm run check    # type-check the page
```

`npm run build` makes a .app and .dmg on a Mac, an .msi and NSIS installer on Windows, and a
.deb, .rpm and AppImage on Linux. Each one has to be built on its own OS. To get all of them at
once, push a version tag (`git tag v0.1.0 && git push --tags`) or run the **Release** workflow
from the GitHub Actions tab. `.github/workflows/release.yml` builds macOS (Apple silicon and
Intel), Windows and Linux, then attaches the bundles to a draft release named after the version
in `src-tauri/tauri.conf.json`.

Needs Rust 1.90 or newer (`rustup update stable`) and, on a Mac, Xcode command line tools.
The page (`ui/`) is a Svelte 5 + TypeScript app built by Vite into `dist/`, which the app
loads and embeds for phones. It needs the app: it reads and saves its config through it.

While `npm run dev` runs, phones get the page as it was built when dev started (rerun to update
them). `npm run dev:web` alone serves the page at `http://localhost:5173` and passes its
config calls to an app already running on port 8787, so a browser there behaves like a phone.

## Phones

When the app starts it runs a small web server on port 8787 (the next free port if that one is
taken). Open **Settings > Phone server** to see:

- whether it's running, with a Start/Stop button and a port you can change (remembered);
- the address to open on a phone on the same wifi, with a QR code to scan;
- how many devices are connected and how many requests they've made;
- **Let phones change the config**: when on (the default), imports and edits made on a phone are
  saved in the app. Anyone on the wifi who opens the page can then change it, so turn it off
  on shared networks.

Every device uses the config saved in the app, and follows changes live. A device with no chat
going picks a change up straight away. Mid-chat, it waits until the next **New chat** or
**Restart script**, so a performance isn't interrupted.

If macOS asks whether "FlopGPT" may accept incoming network connections, allow it, or phones
can't connect. Guest wifi networks often block devices from reaching each other.

## How it plays

1. Type anything and press Enter (Shift+Enter for a new line).
2. The app shows the next scripted response: first the short "pending" blurbs
   (each shown for its own length of time), then the final answer streams in.
3. When the pending blurbs finish they collapse to "Thought for Ns". Click that
   line to expand the full list.

Attachments: the **+** button next to the text box adds photos, video, audio, PDFs or
text files (up to 10). You can also paste an image or drop files on the page. They show up as
thumbnails above the box, can be removed with the x, and appear in the thread when sent
(click an image to enlarge it). Files never leave the browser. You can send attachments with
no text.

Performer shortcuts:

- If a response has a `"prompt"`, the app can type it for you. On desktop press **Tab** on an
  empty box. On a phone (or with a mouse) **long-press the send button** while the box is empty:
  the button shrinks, the phone buzzes, and the prompt is typed out. Then tap send.
- A quick tap on send (or Enter) on an empty box skips the typing and sends the prompt straight away.
- **New chat** (sidebar) or **Settings > Restart script** rewinds to response 1.
- After the last response, further prompts get the `fallback` message.

## Logo

The default logo is a sparkle. To use your own, either:

- Open the sidebar footer > sliders icon > **Logo > Choose image...** (PNG, JPG, SVG, etc.;
  it's stored in the config, so it's exported with it; **Reset** puts the sparkle back), or
- Put an image file in `ui/public/` and set `"logo": "my-logo.png"` in the config (a URL or data URI
  works too).

It replaces the sparkle in the sidebar, the empty-chat greeting, the mark at the end of each
reply, and the browser tab icon. A square image with a transparent background looks best.

## Thinking spinners

While the pending blurbs show, a small animated spinner sits beside them, drawn in the accent
color. A random one is picked from `ui/src/lib/spinners.ts` each time a response starts (never the same one
twice in a row). To add your own, paste SVG markup as another entry in that file; any `fill` on
the root `<svg>` is ignored so it picks up the accent color. In the config,
`"spinner": "random"` is the default; use `"none"`, one name (`"3-dots-bounce"`), or a list of
names (`["3-dots-fade", "4-dots-gooey"]`) to limit it.

## The config

Everything about a demo (branding, responses and the old conversations in the sidebar) is one
JSON config. The app starts with a built-in one (`src-tauri/default-config.json`).

- **Settings > Config > Import...**, or drop a `.json` file anywhere on the page, loads one.
  Older separate files still work: a script-only file keeps the current old conversations, and a
  threads-only file replaces just the old conversations. Any other file you drop is attached to
  the next message instead.
- **Export...** saves the current config as a file.
- **Edit** opens an editor. The **Form** tab has fields for the settings, each response (prompt,
  thinking steps with optional seconds, Markdown reply) and the sidebar headings and chats; the
  **JSON** tab shows the whole config for anything the form doesn't cover. **Save & restart**
  saves and starts the chat over.
- **Reset to defaults** deletes the saved config and goes back to the built-in one.

The config is saved in `~/Library/Application Support/com.cocowmn.flopgpt/config.json`.
Phones save to the app through its server.

## Config format

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
| `pending` | response | Short blurbs shown in order. Each is a string, or `{ "text", "seconds" }`. (`thinking` also works.) |
| `seconds` | pending item | How long that blurb stays up. Default is `defaultPendingSeconds` (2.5). |
| `defaultPendingSeconds` | top level or response | Default blurb duration. A response-level value beats the top-level one. |
| `response` | response | The final message (Markdown). `text` also works. A bare string in `responses` is a response with no blurbs. |
| `prompt` | response | Optional line the performer can auto-type (Tab) or auto-send (Enter on empty). |
| `streamResponse`, `charsPerSecond` | top level or response | Typewriter streaming on or off, and its speed. |
| `typingCharsPerSecond` | top level | How fast Tab / long-press types a `prompt` (default 28). |
| `thoughtLabel` | top level | Label after thinking finishes. `{s}` is the seconds. |
| `appName`, `modelName`, `userName`, `greeting`, `placeholder`, `disclaimer`, `accent` | top level | Branding. `accent` also colors the thinking spinners. |
| `logo` | top level | Path, URL or data URI of a logo image (see Logo above). |
| `spinner` | top level | `"random"` (default), `"none"`, a spinner name, or a list of names. |
| `threads` | top level | Old conversations in the sidebar. `group` sets a heading; chats after it inherit it until the next `group`. Plain strings also work. They're cosmetic: clicking one highlights it, and the sidebar search filters them. |

Markdown supported in responses: paragraphs, `#` headings, `-` and `1.` lists, `>` quotes,
fenced code blocks, `` `inline code` ``, `**bold**`, `*italic*`, `[links](https://...)`, `---`.

## Files

- `ui/src/App.svelte` - the page; `ui/src/components/` - its parts (sidebar, chat, composer,
  settings and the config editor)
- `ui/src/lib/stores/` - app state: the config and syncing it (`config.svelte.ts`), the chat
  playing the script (`chat.svelte.ts`), and UI state (`ui.svelte.ts`)
- `ui/src/lib/` - config parsing (`normalize.ts`), the Markdown renderer, and calls to the app (`backend.ts`)
- `ui/src/lib/spinners.ts` - the animated thinking spinners (add your own here)
- `ui/src/styles/global.css` - colors and shared styles; everything else is styled in its component
- `src-tauri/default-config.json` - the built-in config
- `src-tauri/src/server.rs` - the phone server and saved config; `src-tauri/src/lib.rs` - the
  commands the settings dialog calls
