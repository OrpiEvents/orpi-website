# ORPI Events website

The public site at **orpi.events**: our brand, packages, favourite drinks and
the enquiry form that feeds the Sales Pipeline in Notion. Plain HTML, CSS and a little
JavaScript, built by one Python script and hosted on Vercel. It's in Punit's
2026 brand (Grift, Stout, Tangerine for actions, Amber Gold for quiet labels,
flat surfaces, logos as SVG).

| Page | Address | Source |
| --- | --- | --- |
| Home | `/` | `_src/pages/index.html` |
| Get a quote | `/enquire` | `_src/pages/enquire.html` |
| Terms & conditions | `/terms` | `_src/pages/terms.html` |
| Privacy notice | `/privacy` | `_src/pages/privacy.html` |
| Page not found | any unknown address | `_src/pages/404.html` |

## Making a change

1. Edit the page in `_src/pages/`, never the `.html` files in the root (they're
   generated and get overwritten).
2. The shared `<head>`, navigation, footer and contact details (WhatsApp
   number, email, Instagram, client login link) live in `_src/build.py`.
   Styles are in `assets/css/site.css` (brand colours at the top); scripts are
   in `assets/js/`.
3. Run `python3 _src/build.py` from this folder and commit the generated pages
   with your change.
4. To look at it locally with clean addresses (`/terms` rather than
   `/terms.html`), run `npx serve .` and open http://localhost:3000.

Push a branch and Vercel gives it a preview address
(`orpi-website-git-<branch>-orpievents-projects.vercel.app`, sign in to Vercel
to open it). **`main` is the live site.**

Where things come from:

- **Terms** are a copy of the terms clients sign in the ops app
  (`lib/terms.js`, version 2026-10-20). When those change, change
  `_src/pages/terms.html` too, including the version line.
- **Privacy notice** describes exactly what this site and the booking system
  do. If the site ever adds analytics, a Meta pixel or any cookie, the notice
  (and a cookie banner) has to change first.
- **Drinks**: there's no full menu on the site on purpose. The homepage shows
  a few favourites (`#drinks` in `_src/pages/index.html`): Punit's
  illustrations for the cocktails, and text cards for the sober serves until
  they have illustrations too. Illustrations live in
  `assets/brand/illustrations` (480×480, white background). `/menu` redirects
  to the favourites.
- **Photos and brand files** are in `assets/img` and `assets/brand`. If you
  replace an image, give it a new file name: browsers keep images for a week.
  CSS and JS changes show straight away (the build stamps each link with the
  file's fingerprint).

## How enquiries work

The form posts to the ops app: `https://book.orpi.events/api/public/enquiry`.
That writes the enquiry to the Notion Sales Pipeline (channel "Website form"),
emails the inbox and records where it came from. The site itself holds no keys
or secrets.

- Links into the site with `?utm_source=…`, `?l=<link slug>` or `fbclid` keep
  that attribution all the way to the form. Tracked links from the ops app
  (`book.orpi.events/go/<slug>`) can point straight at orpi.events.
- `/enquire?package=Ultimate` or `/enquire?event=Wedding%20Reception` pre-fill
  the form.
- If the booking system can't be reached, the form offers a pre-filled email
  to hello@orpi.events so the enquiry isn't lost.
- The ops app only accepts the form from `https://orpi.events` and
  `https://www.orpi.events`. To try the real form on a preview, add the
  preview address to `GROWTH_ALLOWED_ORIGINS` in the **orpi-app** project's
  environment variables, and delete the test enquiry from Notion afterwards.

## Launch checklist

1. Both directors happy with the preview, copy points settled.
2. Merge `redesign-2026` into `main`.
3. Vercel → orpi-website → Domains: `orpi.events`, plus `www.orpi.events`
   redirecting to it. Use the DNS values Vercel shows there; at the time of
   writing they were A `@` → `216.150.1.1` and `216.150.16.1`, CNAME `www` →
   `2b1eb5e92a5f39d1.vercel-dns-017.com`. Change them in GoDaddy and leave the
   email (MX) records alone.
4. Send one real enquiry from orpi.events/enquire, check it reaches Notion and
   the inbox, then delete it.
5. Point the Instagram bio and Google Business Profile at orpi.events, and set
   `GROWTH_FALLBACK_URL` in the orpi-app project to
   `https://orpi.events/enquire` so retired tracked links land on the new form.
6. Confirm the Grift licence covers self-hosting on the website.
