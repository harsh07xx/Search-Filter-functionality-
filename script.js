"use strict";

/* =====================================================================
   BINSTOCK — inventory data
   Each item models a physical bin in a small parts warehouse.
   ===================================================================== */

const INVENTORY = [
  { id: "bs-001", sku: "MCB-M3P-14", name: "MacBook Pro 14\u2033",        zone: "Compute",    price: 189999, stock: 6,  },
  { id: "bs-002", sku: "IPH-15-128", name: "iPhone 15 128GB",           zone: "Compute",    price: 79999,  stock: 14, },
  { id: "bs-003", sku: "AUD-WH1K-X", name: "Sony WH-1000X Headphones",  zone: "Audio",      price: 29990,  stock: 22, },
  { id: "bs-004", sku: "TAB-IPA-64", name: "iPad Air 64GB",             zone: "Compute",    price: 59900,  stock: 9,  },
  { id: "bs-005", sku: "MCU-ESP32D", name: "ESP32-DevKit Module",       zone: "Components", price: 449,    stock: 138,},
  { id: "bs-006", sku: "MCU-ARDUNO", name: "Arduino Uno R4",            zone: "Components", price: 1899,   stock: 61, },
  { id: "bs-007", sku: "SNS-DHT22T", name: "DHT22 Temp/Humidity Sensor",zone: "Components", price: 249,    stock: 4,  },
  { id: "bs-008", sku: "PSU-12V5A0", name: "12V 5A Bench PSU",          zone: "Power",      price: 2199,   stock: 17, },
  { id: "bs-009", sku: "PWR-PBK20K", name: "20,000mAh Power Bank",      zone: "Power",      price: 1799,   stock: 3,  },
  { id: "bs-010", sku: "APL-LINEN1", name: "Linen Shirt, Slate",        zone: "Apparel",    price: 1499,   stock: 40, },
  { id: "bs-011", sku: "APL-JEAN02", name: "Slim Taper Jeans",          zone: "Apparel",    price: 2899,   stock: 25, },
  { id: "bs-012", sku: "APL-SHOE07", name: "Trail Running Shoes",       zone: "Apparel",    price: 4499,   stock: 2,  },
  { id: "bs-013", sku: "BOK-AHAB01", name: "Atomic Habits",             zone: "Print",      price: 399,    stock: 55, },
  { id: "bs-014", sku: "BOK-DWORK1", name: "Deep Work",                 zone: "Print",      price: 349,    stock: 31, },
  { id: "bs-015", sku: "BOK-CLNAB1", name: "Clean Architecture",        zone: "Print",      price: 899,    stock: 12, },
  { id: "bs-016", sku: "TL-SLDR60W", name: "60W Soldering Iron Kit",    zone: "Tools",      price: 1299,   stock: 8,  },
  { id: "bs-017", sku: "TL-DMM4000", name: "Digital Multimeter",        zone: "Tools",      price: 1099,   stock: 19, },
  { id: "bs-018", sku: "CMP-USBC1M", name: "USB-C Cable, 1m Braided",   zone: "Components", price: 299,    stock: 210,},
];

const ZONE_COLOR = {
  Compute:    "#F5A623",
  Audio:      "#8B7CF6",
  Components: "#4ADE80",
  Power:      "#F97066",
  Apparel:    "#38BDF8",
  Print:      "#F472B6",
  Tools:      "#FBBF24",
};

const LOW_STOCK_THRESHOLD = 5;
const SEARCH_DEBOUNCE_MS = 160;
const RECENT_SEARCH_KEY = "binstock:recent-searches";
const MAX_RECENT_SEARCHES = 5;

/* =====================================================================
   Application state
   ===================================================================== */

const state = {
  query: "",
  zone: "All",
  sort: "relevance",
};

/* =====================================================================
   DOM references
   ===================================================================== */

const el = {
  searchInput: document.getElementById("searchInput"),
  searchSide: document.getElementById("searchSide"),
  sortSelect: document.getElementById("sortSelect"),
  zoneRow: document.getElementById("zoneRow"),
  trace: document.getElementById("trace"),
  binGrid: document.getElementById("binGrid"),
  emptyState: document.getElementById("emptyState"),
  emptyTitle: document.getElementById("emptyTitle"),
  emptyReset: document.getElementById("emptyReset"),
  resultCount: document.getElementById("resultCount"),
  statusText: document.getElementById("statusText"),
  statusTime: document.getElementById("statusTime"),
  legendZones: document.getElementById("legendZones"),
  recentRow: document.getElementById("recentRow"),
};

/* =====================================================================
   Utilities
   ===================================================================== */

function debounce(fn, wait) {
  let timer = null;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Wrap the first case-insensitive match of `query` inside `text` in <mark>. */
function highlightMatch(text, query) {
  if (!query) return escapeHtml(text);
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return escapeHtml(text);
  const before = escapeHtml(text.slice(0, idx));
  const match = escapeHtml(text.slice(idx, idx + query.length));
  const after = escapeHtml(text.slice(idx + query.length));
  return `${before}<mark>${match}</mark>${after}`;
}

function formatPrice(paise) {
  return "\u20B9" + paise.toLocaleString("en-IN");
}

function formatTime(date) {
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/* =====================================================================
   Recent-search memory (sessionStorage, falls back to an in-memory
   array if storage is unavailable — e.g. file:// in some browsers)
   ===================================================================== */

let recentSearchesMemory = [];

function readRecentSearches() {
  try {
    const raw = sessionStorage.getItem(RECENT_SEARCH_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return recentSearchesMemory;
  }
}

function writeRecentSearches(list) {
  recentSearchesMemory = list;
  try {
    sessionStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(list));
  } catch (err) {
    /* storage unavailable — in-memory fallback already updated above */
  }
}

function pushRecentSearch(query) {
  if (!query || query.length < 2) return;
  const existing = readRecentSearches().filter((q) => q.toLowerCase() !== query.toLowerCase());
  const updated = [query, ...existing].slice(0, MAX_RECENT_SEARCHES);
  writeRecentSearches(updated);
}

function removeRecentSearch(query) {
  const updated = readRecentSearches().filter((q) => q !== query);
  writeRecentSearches(updated);
  renderRecentSearches();
}

/* =====================================================================
   Derived data
   ===================================================================== */

function getZones() {
  const counts = { All: INVENTORY.length };
  for (const item of INVENTORY) {
    counts[item.zone] = (counts[item.zone] || 0) + 1;
  }
  const ordered = ["All", ...Array.from(new Set(INVENTORY.map((i) => i.zone))).sort()];
  return ordered.map((zone) => ({ zone, count: counts[zone] }));
}

const ZONES = getZones();

/** Relevance score: exact name start > substring in name > substring in SKU. */
function relevanceScore(item, query) {
  if (!query) return 0;
  const q = query.toLowerCase();
  const name = item.name.toLowerCase();
  const sku = item.sku.toLowerCase();
  if (name.startsWith(q)) return 3;
  if (name.includes(q)) return 2;
  if (sku.includes(q)) return 1;
  return 0;
}

function matchesQuery(item, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
}

function getFilteredResults() {
  const { query, zone, sort } = state;

  let results = INVENTORY.filter((item) => {
    const matchZone = zone === "All" || item.zone === zone;
    return matchZone && matchesQuery(item, query);
  });

  const comparators = {
    relevance: (a, b) => relevanceScore(b, query) - relevanceScore(a, query) || a.name.localeCompare(b.name),
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    "name-asc": (a, b) => a.name.localeCompare(b.name),
    "stock-desc": (a, b) => b.stock - a.stock,
  };

  results = results.slice().sort(comparators[sort] || comparators.relevance);
  return results;
}

/* =====================================================================
   Rendering
   ===================================================================== */

/** Populates the static zone-color legend once; it does not depend on filter state. */
function renderLegend() {
  const zonesOnly = ZONES.filter((z) => z.zone !== "All");
  el.legendZones.innerHTML = zonesOnly
    .map(({ zone }) => {
      const color = ZONE_COLOR[zone] || "#F5A623";
      return `<li><span class="legend-dot" style="background:${color}"></span>${escapeHtml(zone)}</li>`;
    })
    .join("");
}

function renderRecentSearches() {
  const recent = readRecentSearches();
  if (recent.length === 0) {
    el.recentRow.innerHTML = "";
    return;
  }
  const chips = recent
    .map(
      (q) => `
      <button class="recent-chip" type="button" data-query="${escapeHtml(q)}">
        ${escapeHtml(q)}
        <span class="recent-chip-x" data-remove="${escapeHtml(q)}">\u2715</span>
      </button>`
    )
    .join("");
  el.recentRow.innerHTML = `<span class="recent-label">Recent</span>${chips}`;

  el.recentRow.querySelectorAll(".recent-chip").forEach((chip) => {
    chip.addEventListener("click", (e) => {
      const removeQuery = e.target.dataset.remove;
      if (removeQuery !== undefined) {
        e.stopPropagation();
        removeRecentSearch(removeQuery);
        return;
      }
      const query = chip.dataset.query;
      state.query = query;
      el.searchInput.value = query;
      render();
    });
  });
}

function renderZonePills() {
  el.zoneRow.innerHTML = "";
  for (const { zone, count } of ZONES) {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "zone-pill" + (zone === state.zone ? " active" : "");
    pill.setAttribute("aria-pressed", String(zone === state.zone));
    pill.innerHTML = `<span>${zone}</span><span class="zone-tag">${count}</span>`;
    pill.addEventListener("click", () => {
      state.zone = zone;
      render();
    });
    el.zoneRow.appendChild(pill);
  }
}

function renderTrace(resultCount) {
  const parts = [];
  parts.push(state.zone === "All" ? "all zones" : state.zone.toLowerCase());
  if (state.query) parts.push(`matching "<strong>${escapeHtml(state.query)}</strong>"`);
  const sortLabels = {
    relevance: "by relevance",
    "price-asc": "by price, low to high",
    "price-desc": "by price, high to low",
    "name-asc": "alphabetically",
    "stock-desc": "by stock level",
  };
  parts.push(sortLabels[state.sort]);
  el.trace.innerHTML = `Showing ${resultCount} bin${resultCount === 1 ? "" : "s"} in ${parts.join(", ")}`;
}

function renderCard(item) {
  const card = document.createElement("article");
  card.className = "bin-card";
  card.style.setProperty("--zone-color", ZONE_COLOR[item.zone] || "#F5A623");

  const isLow = item.stock <= LOW_STOCK_THRESHOLD;
  const statusClass = isLow ? "low-stock" : "in-stock";
  const statusLabel = isLow ? "Low stock" : "In stock";

  card.innerHTML = `
    <div class="bin-top">
      <span class="bin-sku">${escapeHtml(item.sku)}</span>
      <span class="bin-status ${statusClass}">${statusLabel}</span>
    </div>
    <h2 class="bin-name">${highlightMatch(item.name, state.query)}</h2>
    <span class="bin-zone">
      <span class="bin-zone-dot"></span>${escapeHtml(item.zone)}
    </span>
    <div class="bin-footer">
      <span class="bin-price">${formatPrice(item.price)}</span>
      <span class="bin-stock-count">${item.stock} units</span>
    </div>
  `;
  return card;
}

function renderGrid(results) {
  el.binGrid.innerHTML = "";
  const fragment = document.createDocumentFragment();
  for (const item of results) {
    fragment.appendChild(renderCard(item));
  }
  el.binGrid.appendChild(fragment);
}

function renderEmptyState(isEmpty) {
  el.emptyState.hidden = !isEmpty;
  el.binGrid.hidden = isEmpty;
  if (isEmpty) {
    el.emptyTitle.textContent = state.query
      ? `Nothing matches "${state.query}"`
      : "No bins in this zone";
  }
}

function renderSearchSide() {
  if (state.query) {
    el.searchSide.innerHTML = `<button class="clear-btn" id="clearBtn" type="button">\u2715 clear</button>`;
    document.getElementById("clearBtn").addEventListener("click", () => {
      state.query = "";
      el.searchInput.value = "";
      render();
      el.searchInput.focus();
    });
  } else {
    el.searchSide.innerHTML = `<span class="kbd-hint"><kbd>/</kbd> focus</span>`;
  }
}

function updateStatusBar(resultCount) {
  el.statusText.textContent = resultCount > 0 ? `${resultCount} results ready` : "No matches";
  el.statusTime.textContent = formatTime(new Date());
}

function render() {
  const results = getFilteredResults();

  el.resultCount.textContent = String(results.length).padStart(2, "0");
  renderZonePills();
  renderTrace(results.length);
  renderSearchSide();
  renderEmptyState(results.length === 0);
  if (results.length > 0) renderGrid(results);
  updateStatusBar(results.length);
}

/* =====================================================================
   Event wiring
   ===================================================================== */

const debouncedSearch = debounce((value) => {
  state.query = value.trim();
  render();
  pushRecentSearch(state.query);
  renderRecentSearches();
}, SEARCH_DEBOUNCE_MS);

el.searchInput.addEventListener("input", (e) => {
  debouncedSearch(e.target.value);
});

el.sortSelect.addEventListener("change", (e) => {
  state.sort = e.target.value;
  render();
});

el.emptyReset.addEventListener("click", () => {
  state.query = "";
  state.zone = "All";
  el.searchInput.value = "";
  render();
  el.searchInput.focus();
});

document.addEventListener("keydown", (e) => {
  const isTypingTarget = e.target === el.searchInput;

  if (e.key === "/" && !isTypingTarget) {
    e.preventDefault();
    el.searchInput.focus();
  }

  if (e.key === "Escape" && isTypingTarget) {
    state.query = "";
    el.searchInput.value = "";
    render();
    el.searchInput.blur();
  }
});

/* =====================================================================
   Init
   ===================================================================== */

renderLegend();
renderRecentSearches();
render();

