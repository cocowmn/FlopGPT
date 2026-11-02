# Write your script

**What you'll end up with:** a chatbot that answers with your lines, in your order, with as much fake "thinking" as the joke needs.

![A scripted reply, with its thinking steps opened](images/perform-thoughts-expanded.png)

## How a script works (30-second version)

- A script is a list of **responses**. Each time someone sends a message, the next response plays, whatever they typed.
- Each response has up to four parts:
  - **Prompt** (optional): the line your performer "types". FlopGPT can type it for them (see [Run the show](run-the-show.md)).
  - **Thinking steps:** short lines like "Thinking…" that flash by before the answer.
  - **Generated image** (optional): a picture the AI pretends to draw. See [Make it "generate" an image](#make-it-generate-an-image).
  - **Response:** the answer itself.
- Once all the responses have played, every message gets the **After the last response** message, until you start a new chat.

## Change what the AI says back

1. Open **Settings** (the sliders button at the bottom of the sidebar).
2. On the **Conversation** tab, next to **Script**, click **Edit**.

   ![The Conversation tab: the Edit buttons, the playback options and the config file](images/settings-conversation.png)

3. Scroll down to **Script**. Each card is one response, in the order they'll play.

   ![One response card: prompt, thinking steps and response](images/editor-response-card.png)

4. Type the answer into **Response (Markdown)**.
5. Click **Save & restart**. The chat starts over with your new script.

**Card buttons:**

- **+ Add response** (below the last card) adds a new card to the end.
- **↑** and **↓** move a card earlier or later.
- **✕** deletes a card.

## Make it "think" before answering

The thinking steps are where a lot of the comedy lives ("Thinking of a believable lie…").

1. In a response card, type a line into a **Thinking step** box.
2. Click **+ Add step** for each extra line. They show one after another, in order.
3. Optional: type a number of seconds in the small box next to a step to keep it on screen longer or shorter. Leave the box blank to use the default.

While the steps play, they look like this:

![A thinking step on screen, with an animated spinner](images/perform-thinking.png)

When the answer arrives, the steps fold up into a line like "Thought for 7s", which anyone can click to read them all again.

**Tips:**

- **Comic timing:** give a short step (1–1.5 s) right before a long one (3–4 s). The pause sells the punchline.
- **Answer instantly:** delete all the thinking steps from that card.

## Make it "generate" an image

A response can "draw" a picture, like the image generators in real chatbots. It's any image you choose, revealed as if it were being made on the spot.

1. In a response card, next to **Generated image**, click **Upload…** and pick a picture. You can also drag one onto the field, or paste the address of an image on the web.
2. Optional: set **Seconds to generate** for how long it "works" on it, and a **Description** for screen readers.
3. Click **Save & restart**.

The thinking steps play first, then a shimmering "Creating Image..." line appears above a placeholder, just like a thinking step, until the picture arrives. The response's text comes after the picture, so it works as a caption ("Here's your portrait!").

![An image being generated, with the animated placeholder](images/perform-image-generating.png)

Choose how the picture comes in under **While an image generates, show** on the **Conversation** tab:

- **An animated placeholder:** soft colors drift in the frame, then the picture fades in.
- **Rough drafts that sharpen:** blurry, grainy versions of your picture appear, each one clearer than the last, like early image generators.

![The finished image, with its caption](images/perform-image.png)

**Tips:**

- **Anyone can click the picture** to see it full size.
- **Use a PNG, JPG or WebP.** Uploads are shrunk to 1024 pixels so your setup stays small enough to save and send to phones.
- **Rename the label** to fit your brand with **Image label**, as in `Toasting your portrait`.
- **Rough drafts need an uploaded image.** A picture pasted as a web address only gets drafts if its website allows it; otherwise it shows the animated placeholder.

## Make the prompt type itself

Fill in a card's **Prompt** box with the exact line your performer is supposed to say. During the show, pressing **Tab**, or long-pressing the message box on a phone, makes it type itself out letter by letter. [Run the show](run-the-show.md) explains how to perform with it.

You can leave **Prompt** empty if the performer will type their own words. The response plays either way.

## Make text bold, add lists, and more

Responses support **Markdown**, a few simple symbols that format text:

| Type this                  | To get            |
| -------------------------- | ----------------- |
| `**toast**`                | **toast**         |
| `*toast*`                  | _toast_           |
| `- Toast` on its own line  | a bullet point    |
| `1. Toast` on its own line | a numbered list   |
| `> Toast.`                 | an indented quote |
| `# Toast`                  | a big heading     |
| `[link](https://…)`        | a clickable link  |
| `` `toast` ``              | `code-style` text |
| `![a toast](https://…)`    | a picture         |

Leave an empty line between paragraphs. Emoji work too 🍞. A picture in the text shows up as soon as the typing reaches it, without a "Creating Image..." wait.

## Change the speed and the "thinking" style

The **Playback** section of the **Conversation** tab applies to the whole script. Changes take effect right away, from the next answer on:

![The Playback section of the Conversation tab](images/settings-playback.png)

| Option                               | What it does                                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **Stream replies word by word**      | On: the answer types out word by word. Off: it appears all at once.                                                      |
| **Reply speed (characters/s)**       | How fast the answer types out on screen. Lower is more dramatic.                                                         |
| **Auto-typing speed (characters/s)** | How fast the **Prompt** types itself when you press Tab.                                                                 |
| **Seconds per thinking step**        | How long each thinking step shows, unless the step has its own number (2.5 s if left blank).                             |
| **Seconds to generate an image**     | How long a [generated image](#make-it-generate-an-image) takes, unless its card has its own number (8 s if left blank).  |
| **Spinner**                          | The little animation beside the thinking steps. Leave blank for a random one each time, or type `none` for no animation. |
| **Thought label**                    | What the steps fold up into. `{s}` becomes the number of seconds, as in `Toasted for {s}s`.                              |
| **While an image generates, show**   | An animated placeholder, or rough drafts that sharpen. See [Make it "generate" an image](#make-it-generate-an-image).    |
| **Image label**                      | The line shown above a generating image ("Creating Image..." if left blank).                                             |

**After the last response**, what the AI says to every message once the script has run out, is at the top of the script editor.

## Fill the sidebar with fake old chats

The sidebar's chat history is fake too. It's another chance for jokes ("Help, my toaster is judging me").

1. In **Settings > Conversation**, click **Edit** next to **Old conversations**.
2. Type chat titles into the boxes. **+ Add chat** adds another one.
3. **+ Add heading** adds a bold group label such as "Today" or "Yesterday". It sits above the chats that come after it.
4. Click **Save**.

![The Old conversations editor](images/editor-old-conversations.png)

These chats are just for show: clicking one only highlights it.

## Write it as text instead (optional power move)

If you'd rather write the whole script in a text editor, or copy and paste one from a friend, click the **JSON** tab at the top of the editor. JSON is a plain-text way of writing the same script.

![The JSON tab of the script editor](images/editor-json.png)

The shape is simple. Each `{ … }` block in `responses` is one card:

```json
{
  "responses": [
    {
      "prompt": "What should I have for breakfast?",
      "pending": ["Preheating...", { "text": "Ignoring every option that isn't toast...", "seconds": 3 }],
      "response": "Great question! The answer is **toast**."
    },
    {
      "prompt": "Are you biased?",
      "pending": ["No", "Absolutely not", "Well..."],
      "response": "I am a perfectly neutral assistant."
    },
    {
      "prompt": "Draw me as toast",
      "pending": ["Warming up the toaster oven..."],
      "image": "https://example.com/toast-portrait.png",
      "imageSeconds": 6,
      "response": "Here you are. **Golden brown**."
    }
  ],
  "fallback": "I'm all out of crumbs. Start a **New chat** for a fresh loaf."
}
```

- `pending` is the list of thinking steps. A step is either plain text in quotes, or `{ "text": "...", "seconds": 3 }` to set its own time.
- `image` is the generated picture: a web address, or (in an exported .zip) a file in its `assets` folder such as `"assets/toast.png"`. `imageSeconds` sets how long it takes.
- Put commas between items, but not after the last one. If something's wrong, the editor shows an error in red instead of saving.
- Switch back to the **Form** tab at any time; your changes carry over.

A full example is in [examples/toastgpt-config.json](examples/toastgpt-config.json).

## Stuck?

- **My new script didn't play.** Make sure you clicked **Save & restart**, not **Cancel**. If you're mid-chat on a phone, the change waits for the next **New chat**.
- **It keeps saying the same thing.** You've reached the end of the script, so it's showing the **After the last response** message. Click **New chat** to start over.
- **I broke everything.** Click **Reset** next to **Script** to go back to the built-in script. To undo everything (branding included), click **Reset to defaults**.
- **"Not saved" after adding images.** The browser version can only keep a few megabytes. Use fewer or smaller pictures, or use the desktop app.
- **Next:** [make it look like your own product](make-it-your-brand.md), or [learn to perform it](run-the-show.md).
