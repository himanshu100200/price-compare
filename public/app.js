
const $ = id => document.getElementById(id);
const searchInput = $("searchInput");
const results = $("productResults");

let offers = [];
let wishlist = new Set(JSON.parse(localStorage.getItem("pc_wishlist") || "[]"));
let recent = JSON.parse(localStorage.getItem("pc_recent") || "[]");

const money = n => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
}).format(n);

function categoryOf(title) {
  const t = title.toLowerCase();

  if (/iphone|samsung galaxy|redmi|oneplus|pixel|mobile/.test(t)) return "Mobiles";
  if (/laptop|macbook|notebook/.test(t)) return "Laptops";
  if (/shoe|sneaker|shirt|jeans|dress|watch/.test(t)) return "Fashion";
  if (/headphone|earbud|airpod|tablet|tv|camera|speaker/.test(t)) return "Electronics";
  if (/chair|sofa|mattress|mixer/.test(t)) return "Home";

  return "Other";
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function persist() {
  localStorage.setItem("pc_wishlist", JSON.stringify([...wishlist]));
  localStorage.setItem("pc_recent", JSON.stringify(recent));
}

function renderSaved() {
  const w = $("wishlist");
  const r = $("recentSearches");

  w.innerHTML = "";
  r.innerHTML = "";

  if (!wishlist.size) {
    w.innerHTML = '<span class="muted">No saved products yet.</span>';
  }

  wishlist.forEach(name => {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = name + " ×";

    b.onclick = () => {
      wishlist.delete(name);
      persist();
      renderSaved();
    };

    w.append(b);
  });

  if (!recent.length) {
    r.innerHTML = '<span class="muted">No recent searches.</span>';
  }

  recent.forEach(name => {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = name;
    b.onclick = () => search(name);
    r.append(b);
  });
}

// Product title normalization
function productKey(title) {
  return title.toLowerCase()
    .replace(/\b(refurbished|renewed|used|pre-owned|second hand|open box|new|unlocked|smartphone|mobile phone)\b/g, " ")
    .replace(/\b(official|best price|online|buy now|free delivery|free shipping)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((word, i, arr) =>
      !(word === "apple" && arr.includes("iphone"))
    )
    .join(" ");
}

function similarity(a, b) {
  const A = new Set(a.split(" "));
  const B = new Set(b.split(" "));

  const intersection = [...A].filter(x => B.has(x)).length;

  return intersection /
    Math.max(1, new Set([...A, ...B]).size);
}

// Group similar product listings
function makeGroups(list) {
  const groups = [];

  list.forEach(item => {
    const key = productKey(item.title);

    let match = groups.find(group =>
      group.key === key ||
      similarity(group.key, key) >= 0.82
    );

    if (!match) {
      match = { key, items: [] };
      groups.push(match);
    }

    match.items.push(item);
  });

  return groups.map(group =>
    group.items.sort((a, b) => a.price - b.price)
  );
}

// Render product comparisons
function render() {
  const category = $("categoryFilter").value;

  const list = offers.filter(x =>
    category === "All" || x.category === category
  );

  let groups = makeGroups(list);

  const sort = $("sortFilter").value;

  if (sort === "low") {
    groups.sort((a, b) => a[0].price - b[0].price);
  }

  if (sort === "high") {
    groups.sort((a, b) => b[0].price - a[0].price);
  }

  if (sort === "name") {
    groups.sort((a, b) =>
      a[0].title.localeCompare(b[0].title)
    );
  }

  results.innerHTML = "";

  if (!groups.length) {
    results.innerHTML =
      '<p class="empty">No offers found for this filter.</p>';
    return;
  }

  groups.forEach(group => {
    const best = group[0];
    const highest = group[group.length - 1];
    const saving = highest.price - best.price;

    const card = document.createElement("article");
    card.className = "comparison-card";

    const top = document.createElement("div");
    top.className = "comparison-top";

    top.innerHTML =
      '<span class="best-tag">LOWEST FOUND OFFER</span>' +
      '<span class="category-label">' +
      esc(best.category) + '</span>';

    const img = document.createElement("img");
    img.className = "product-photo";
    img.alt = best.title;
    img.src = best.image || "";

    if (!best.image) img.hidden = true;

    img.onerror = () => {
      img.hidden = true;
    };

    const title = document.createElement("h3");
    title.textContent = best.title;

    const save = document.createElement("button");
    save.className = "save-button";

    const updateSaveLabel = () => {
      save.textContent = wishlist.has(best.title)
        ? "♥ Saved"
        : "♡ Save product";
    };

    updateSaveLabel();

    save.onclick = () => {
      wishlist.has(best.title)
        ? wishlist.delete(best.title)
        : wishlist.add(best.title);

      persist();
      renderSaved();
      updateSaveLabel();
    };

    const bestLine = document.createElement("div");
    bestLine.className = "best-line";

    const info = document.createElement("div");
    info.className = "best-price-info";

    info.innerHTML =
      '<small>Lowest listed price</small>' +
      '<strong>' + money(best.price) + '</strong>' +
      '<span>' + esc(best.store) + '</span>';

    const visit = document.createElement("a");
    visit.className = "retailer-link";
    visit.href = best.url || "#";
    visit.target = "_blank";
    visit.rel = "noopener noreferrer";
    visit.textContent = "Visit store";

    bestLine.append(info, visit);

    // Savings information
    const savings = document.createElement("div");
    savings.className = "savings-banner";

    savings.textContent = group.length > 1
      ? "Potential difference between listed offers: " + money(saving)
      : "Only one matching offer was returned by the shopping provider.";

    const heading = document.createElement("p");
    heading.className = "offers-heading";
    heading.textContent =
      "Compare " + group.length +
      " retailer offer" + (group.length === 1 ? "" : "s");

    const offerList = document.createElement("div");
    offerList.className = "offer-list";

    group.forEach((offer, index) => {
      const row = document.createElement("div");
      row.className = "offer-row";

      const store = document.createElement("span");
      store.textContent = offer.store || "Retailer";

      const price = document.createElement("strong");
      price.textContent = money(offer.price);

      const marker = document.createElement("span");
      marker.className = "offer-marker";
      marker.textContent = index === 0 ? "Lowest" : "";

      row.append(store, price, marker);
      offerList.append(row);
    });

    const note = document.createElement("p");
    note.className = "saving-note";

    note.textContent =
      "Offers are grouped using product-title similarity. " +
      "Check exact model, condition, storage, delivery charges " +
      "and final checkout price before buying.";

    card.append(
      top,
      img,
      title,
      save,
      bestLine,
      savings,
      heading,
      offerList,
      note
    );

    results.append(card);
  });

  $("summary").hidden = false;

  $("summary").textContent =
    offers.length + " retailer offers grouped into " +
    groups.length + " product listings. Prices and availability may change.";

  $("status").textContent =
    offers.length + " offers across " +
    groups.length + " product groups";
}

// Search products
async function search(query) {
  const q = query.trim();

  if (!q) return;

  recent = [
    q,
    ...recent.filter(x => x.toLowerCase() !== q.toLowerCase())
  ].slice(0, 6);

  persist();
  renderSaved();

  results.innerHTML =
    '<div class="loading">Searching available shopping offers…</div>';

  $("status").textContent = "Searching…";
  $("summary").hidden = true;

  try {
    const response = await fetch(
      "/api/search?q=" + encodeURIComponent(q)
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Search failed");
    }

    offers = (data.results || [])
      .filter(x => Number(x.price) > 0)
      .map(x => ({
        ...x,
        price: Number(x.price),
        category: categoryOf(x.title || "")
      }));

    $("categoryFilter").value = "All";

    if (!offers.length) {
      results.innerHTML =
        '<p class="empty">No priced offers returned. Try another search.</p>';

      $("status").textContent = "No offers found";
      return;
    }

    render();

  } catch (error) {
    offers = [];

    results.innerHTML =
      '<div class="empty"><strong>Could not load shopping results.</strong><br><br>' +
      esc(error.message) +
      '<br><br>Check backend and provider API key.</div>';

    $("status").textContent = "Search unavailable";
  }
}

// Event listeners
$("searchForm").addEventListener("submit", event => {
  event.preventDefault();
  search(searchInput.value);
});

$("categoryFilter").addEventListener("change", render);
$("sortFilter").addEventListener("change", render);

$("clearButton").onclick = () => {
  searchInput.value = "";
  offers = [];

  results.innerHTML =
    '<p class="empty">Search for a product to compare store offers.</p>';

  $("status").textContent = "Search to compare offers";
  $("summary").hidden = true;
};

// Initial setup
renderSaved();

fetch("/api/health")
  .then(r => r.json())
  .then(data => {
    if (!data.providerConfigured) {
      const warning = document.createElement("div");

      warning.className = "warning";

      warning.textContent =
        "Setup required: add your shopping provider API key to the backend .env file. No sample prices are shown.";

      document.querySelector(".products-section").prepend(warning);
    }
  })
  .catch(() => {});
