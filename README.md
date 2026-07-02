# BINSTOCK

A component inventory console for browsing, searching, and filtering warehouse stock — built with plain HTML, CSS, and JavaScript. No frameworks, no build step, no dependencies.

## Features

- **Live search** across part name and SKU, debounced for smooth typing
- **Zone filtering** with pill-style category chips (Compute, Audio, Components, Power, Apparel, Print, Tools)
- **Sorting** by relevance, price (low↔high), name, or stock level
- **Recent searches**, remembered for the session via `sessionStorage`
- **Keyboard shortcuts** — `/` to focus search, `Esc` to clear it
- **Empty-state and low-stock handling**, with a one-click filter reset
- **Zero dependencies** — a `<link>` and a `<script>` tag away from running anywhere

## Getting started

Clone the repo and open `index.html` directly in a browser — no server or build step required:

```bash
git clone https://github.com/<your-username>/binstock.git
cd binstock
open index.html   # or just double-click the file
```

Prefer a local dev server instead? Any static server works, and one is wired up already:

```bash
npm start
```

## Project structure

```
binstock/
├── index.html     # markup and the containers script.js renders into
├── style.css       # design tokens, layout, and component styles
├── script.js        # inventory data, filtering/sorting logic, rendering
├── package.json
├── README.md
├── LICENSE
└── .gitignore
```

## Customizing the inventory

Inventory items live in the `INVENTORY` array near the top of `script.js`:

```js
{ id: "bs-001", sku: "MCB-M3P-14", name: "MacBook Pro 14\u2033", zone: "Compute", price: 189999, stock: 6 }
```

`price` is in whole paise/cents and formatted with `formatPrice()`. To add a new zone, give it an entry in the `ZONE_COLOR` map in the same file so it gets a legend color and pill.

## License

MIT — see [LICENSE](LICENSE).
