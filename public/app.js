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

function cat(t) {
  t = t.toLowerCase();
  if (/iphone|samsung galaxy|redmi|oneplus|pixel|mobile/.test(t)) return "Mobiles";
  if (/laptop|macbook|notebook/.test(t)) return "Laptops";
  if (/shoe|sneaker|shirt|jeans|dress|watch/.test(t)) return "Fashion";
  if (/headphone|earbud|airpod|tablet|tv|camera|speaker/.test(t)) return "Electronics";
  if (/chair|sofa|mattress|mixer/.test(t)) return "Home";
  return "Other";
}

function persist() {
  localStorage.setItem("pc_wishlist", JSON.stringify([...wishlist]));
  localStorage.setItem("pc_recent", JSON.stringify(recent));
}

function saved() {
  const w = $("wishlist"), r = $("recentSearches");
  w.innerHTML = "";
  r.innerHTML = "";

  if (!wishlist.size) w.textContent = "No saved products yet.";
  wishlist.forEach(n => {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = n + " ×";
    b.onclick = () => {
      wishlist.delete(n);
      persist();
      saved();
    };
    w.append(b);
  });

  if (!recent.length) r.textContent = "No recent searches.";
  recent.forEach(n => {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = n;
    b.onclick = () => search(n);
    r.append(b);
  });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  }[c]));
}

function render() {
  let list = offers.filter(x =>
    $("categoryFilter").value === "All" ||
    x.category === $("categoryFilter").value
  );

  const groups = new Map();
  list.forEach(x => {
    const k = x.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 65);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(x);
  });

  let gs = [...groups.values()].map(a => a.sort((x, y) => x.price - y.price));
  const sort = $("sortFilter").value;

  if (sort === "low") gs.sort((a, b) => a[0].price - b[0].price);
  if (sort === "high") gs.sort((a, b) => b[0].price - a[0].price);
  if (sort === "name") gs.sort((a, b) => a[0].title.localeCompare(b[0].title));

  results.innerHTML = "";

  if (!gs.length) {
    results.innerHTML = '<p class="empty">No offers found for this filter.</p>';
    return;
  }

  gs.forEach(g => {
    const p = g[0];
    const card = document.createElement("article");
    card.className = "comparison-card";

    const top = document.createElement("div");
    top.className = "comparison-top";
    top.innerHTML = '<span class="best-tag">LOWEST FOUND OFFER</span><span class="category-label">' + p.category + '</span>';

    const img = document.createElement("img");
    img.className = "product-photo";
    img.src = p.image || "";
    img.onerror = () => img.style.display = "none";
    if (!p.image) img.style.display = "none";

    const h = document.createElement("h3");
    h.textContent = p.title;

    const save = document.createElement("button");
    save.className = "save-button";
    save.textContent = wishlist.has(p.title) ? "♥ Saved" : "♡ Save product";

    save.onclick = () => {
      wishlist.has(p.title) ? wishlist.delete(p.title) : wishlist.add(p.title);
      persist();
      saved();
      save.textContent = wishlist.has(p.title) ? "♥ Saved" : "♡ Save product";
    };

    const best = document.createElement("div");
    best.className = "best-line";

    const info = document.createElement("div");
    info.innerHTML = '<small>Lowest listed price</small><strong>' + money(p.price) + '</strong><span>' + esc(p.store) + '</span>';

    const a = document.createElement("a");
    a.className = "retailer-link";
    a.href = p.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "Visit store";
    best.append(info, a);

    const hd = document.createElement("p");
    hd.className = "offers-heading";
    hd.textContent = "Compare " + g.length + " available offers";

    const ol = document.createElement("div");
    ol.className = "offer-list";

    g.forEach((o, i) => {
      const row = document.createElement("div");
      row.className = "offer-row";
      row.innerHTML = '<span>' + esc(o.store) + '</span><strong>' + money(o.price) + '</strong><span class="offer-marker">' + (i === 0 ? "Lowest" : "") + '</span>';
      ol.append(row);
    });

    const note = document.createElement("p");
    note.className = "saving-note";
    note.textContent = "Prices may change. Check delivery charges, variants and final checkout price.";

    card.append(top, img, h, save, best, hd, ol, note);
    results.append(card);
  });

  $("summary").hidden = false;
  $("summary").textContent = offers.length + " provider offers returned. Verify final price and availability at the retailer.";
  $("status").textContent = offers.length + " offers across " + gs.length + " products";
}

async function search(q) {
  q = q.trim();
  if (!q) return;

  recent = [q, ...recent.filter(x => x.toLowerCase() !== q.toLowerCase())].slice(0, 6);
  persist();
  saved();

  results.innerHTML = '<div class="loading">Searching available shopping offers…</div>';
  $("status").textContent = "Searching…";
  $("summary").hidden = true;

  try {
    const r = await fetch("/api/search?q=" + encodeURIComponent(q));
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "Search failed");

    offers = (d.results || [])
      .filter(x => Number(x.price) > 0)
      .map(x => ({ ...x, price: Number(x.price), category: cat(x.title) }));

    $("categoryFilter").value = "All";

    if (!offers.length) {
      results.innerHTML = '<p class="empty">No priced offers returned. Try another search.</p>';
      $("status").textContent = "No offers found";
      return;
    }

    render();
  } catch (e) {
    offers = [];
    results.innerHTML = '<div class="empty"><strong>Could not load shopping results.</strong><br><br>' + esc(e.message) + '<br><br>Check backend and provider API key.</div>';
    $("status").textContent = "Search unavailable";
  }
}

$("searchForm").addEventListener("submit", e => {
  e.preventDefault();
  search(searchInput.value);
});

$("categoryFilter").addEventListener("change", render);
$("sortFilter").addEventListener("change", render);

$("clearButton").onclick = () => {
  searchInput.value = "";
  offers = [];
  results.innerHTML = '<p class="empty">Search for a product to compare store offers.</p>';
  $("status").textContent = "Search to compare offers";
  $("summary").hidden = true;
};

saved();

fetch("/api/health")
  .then(r => r.json())
  .then(d => {
    if (!d.providerConfigured) {
      const n = document.createElement("div");
      n.className = "warning";
      n.textContent = "Setup required: add your shopping provider API key to the backend .env file. No fake sample prices are shown.";
      document.querySelector(".products-section").prepend(n);
    }
  })
  .catch(() => {});
