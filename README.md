# Chapter Quest

Turn any PDF chapter into a quiz game. Upload a PDF, get fill-in-the-blank, true/false and unscramble
questions made from your own pages, with XP, levels, streaks, hints, badges, flashcards and a printable worksheet.

Everything runs in the browser. PDFs are never uploaded anywhere, and it works offline after the first visit.

Developed by **Ayush Yadav**.

## Put it online with GitHub Pages (free)

1. Create a free account at github.com, then click **New repository**. Name it `chapter-quest`, keep it **Public**, click **Create**.
2. Click **uploading an existing file**. Drag in everything from this folder (`index.html`, `app.js`, `engine.js`, `sw.js`,
   `manifest.webmanifest`, and the `lib` and `icons` folders). Click **Commit changes**.
3. Open **Settings > Pages**. Under **Build and deployment**, set Source to **Deploy from a branch**, Branch **main**, folder **/ (root)**. Click **Save**.
4. After about a minute your site is live at `https://YOUR-USERNAME.github.io/chapter-quest/`.

On a phone, open that link in Chrome and choose **Add to Home screen** to install it like an app.

## Change it

- `engine.js` makes the questions.
- `app.js` is the game, profile and scoring.
- `index.html` is the layout and colours.
- `lib/` is the PDF reader (Mozilla pdf.js, Apache 2.0 licence included).
