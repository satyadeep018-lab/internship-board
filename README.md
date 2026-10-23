# Responsive Internship Board

An accessible internship listing interface built with plain HTML, CSS and JavaScript. No framework, no build step, no npm. It works on mobile, tablet and desktop.

- **Live preview:** _add your deployed URL here_
- **Repository:** _add your GitHub repo URL here_

## Features

- Cards rendered from `data/internships.json` by JavaScript (no hard-coded cards)
- Text search (title, skill, location), domain filter and work-mode filter, combinable
- Clear filters button
- Loading, empty and error states, with Retry on errors
- Details dialog (native `<dialog>`) with an application form
- Form validation: missing name, invalid email, unsafe portfolio URL, duplicate application
- Result count announced to screen readers through an `aria-live` region
- Mobile-first layout: 1 column on phones, 2 on tablets, 3 on desktops

## Accessibility notes

- Skip link to the results, one `h1`, logical `h2`/`h3` headings, landmarks (`header`, `main`, `footer`, search form)
- Every input has a visible `<label>`; form errors are text ("Error: ...") linked with `aria-describedby`, plus `aria-invalid` and a thicker border, so colour is never the only signal
- Everything works by keyboard: Tab through search, filters, cards and dialog; Esc closes the dialog and focus returns to the card button that opened it
- Visible focus outline on all interactive elements
- `prefers-reduced-motion` turns off animation
- Text uses dark-on-light colour pairs chosen for strong contrast (verify with your own checker, see Testing)
- All data is inserted with `textContent`, never `innerHTML`

## How to run

Opening `index.html` by double-click blocks `fetch()` in most browsers, so use a local server:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>. Stop the server with Ctrl+C.

To see the error and retry states, open <http://localhost:8000/?fail=1>.

## Simulated API

The product brief describes a server API. This project is static (no server), so `js/app.js` contains a small in-browser API layer that returns a predictable envelope:

```json
{ "status": "ok", "data": [ ... ], "pagination": { "page": 1, "pageSize": 6, "total": 5, "totalPages": 1 } }
```

Errors return `{ "status": "error", "message": "..." }` (plus `errors` per field for the form).

**Limits, stated honestly:** validation and duplicate detection run in the browser. Duplicates are tracked in `localStorage` per browser as hashed keys, so they are not enforced across devices. A real server would repeat all checks. Console logs record only the internship ID, never names, emails or links.

## Project structure

```
index.html
css/styles.css
js/app.js
data/internships.json
screenshots/
.gitignore
README.md
```

## Testing

Fill in the results after testing yourself.

| Check | Result |
|---|---|
| 320px: no horizontal scroll | |
| 360px: no horizontal scroll | |
| 768px layout (2 columns) | |
| Desktop layout (3 columns) | |
| Keyboard only: search, filters, card, dialog, form, Esc | |
| Error state with `?fail=1`, then Retry | |
| Empty state (search for `zzz`) | |
| Duplicate application rejected | |
| Invalid email and `javascript:` URL rejected | |

## Screenshots

Add images to `screenshots/` and link them here:

- `screenshots/mobile-360.png`
- `screenshots/tablet-768.png`
- `screenshots/desktop.png`

![Mobile 360px](screenshots/mobile-360.png)
![Tablet 768px](screenshots/tablet-768.png)
![Desktop](screenshots/desktop.png)
