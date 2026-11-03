
const $ = id => document.getElementById(id);

const searchInput = $("searchInput");
const results = $("productResults");

let offers = [];

let wishlist = new Set(
    JSON.parse(localStorage.getItem("pc_wishlist") || "[]")
);

let recent = JSON.parse(
    localStorage.getItem("pc_recent") || "[]"
);

// Format Indian currency
const money = price =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(price);


// Detect product category
function categoryOf(title) {
    const t = title.toLowerCase();

    if (/iphone|samsung galaxy|redmi|oneplus|pixel|mobile/.test(t))
        return "Mobiles";

    if (/laptop|macbook|notebook/.test(t))
        return "Laptops";

    if (/shoe|sneaker|shirt|jeans|dress|watch/.test(t))
        return "Fashion";

    if (/headphone|earbud|airpod|tablet|tv|camera|speaker/.test(t))
        return "Electronics";

    if (/chair|sofa|mattress|mixer/.test(t))
        return "Home";

    return "Other";
}


// Safe text handling
function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[c]));
}


// Save wishlist and recent searches
function persist() {
    localStorage.setItem(
        "pc_wishlist",
        JSON.stringify([...wishlist])
    );

    localStorage.setItem(
        "pc_recent",
        JSON.stringify(recent)
    );
}


// Display saved products and recent searches
function renderSaved() {
    const w = $("wishlist");
    const r = $("recentSearches");

    w.innerHTML = "";
    r.innerHTML = "";

    if (!wishlist.size) {
        w.innerHTML =
            '<span class="muted">No saved products yet.</span>';
    }

    wishlist.forEach(name => {
        const button = document.createElement("button");

        button.className = "chip";
        button.textContent = name + " ×";

        button.onclick = () => {
            wishlist.delete(name);
            persist();
            renderSaved();
        };

        w.append(button);
    });

    if (!recent.length) {
        r.innerHTML =
            '<span class="muted">No recent searches.</span>';
    }

    recent.forEach(name => {
        const button = document.createElement("button");

        button.className = "chip";
        button.textContent = name;

        button.onclick = () => {
            searchInput.value = name;
            search(name);
        };

        r.append(button);
    });
}


// Detect product condition
function getCondition(title) {
    const t = title.toLowerCase();

    if (/\b(refurbished|renewed|überholtes|reconditioned)\b/.test(t))
        return "Refurbished";

    if (/\b(used|pre-owned|second hand|secondhand)\b/.test(t))
        return "Used";

    if (/\b(new|brand new|sealed)\b/.test(t))
        return "New";

    return "Unknown";
}


// Detect storage variant
function getStorage(title) {
    const matches = [
        ...title.matchAll(
            /\b(32|64|128|256|512|1024|2048)\s?gb\b/ig
        )
    ];

    if (matches.length) {
        return matches[matches.length - 1][1] + "GB";
    }

    const tb = title.match(/\b(1|2)\s?tb\b/i);

    return tb ? tb[1] + "TB" : "";
}


// Detect exact model
function getModel(title) {
    const t = title.toLowerCase()
        .replace(/[‐‑–—]/g, "-");

    const patterns = [
        /\biphone\s*(\d{1,2})\s*(pro\s*max|pro|max|plus|mini)?\b/,

        /\b(samsung\s*)?galaxy\s*(s|z|a|m)\s?(\d{1,3})\s*(ultra|plus|fe|fold|flip)?\b/,

        /\b(redmi\s*note|redmi|poco|oneplus|pixel)\s*(\d{1,2})\s*(pro\s*max|pro|plus|ultra|a)?\b/,

        /\b(macbook\s*(air|pro)?|ipad\s*(pro|air|mini)?)\b/
    ];

    for (const pattern of patterns) {
        const match = t.match(pattern);

        if (match) {
            return match
                .slice(1)
                .filter(Boolean)
                .join(" ")
                .replace(/\s+/g, " ")
                .trim();
        }
    }

    return "";
}


// Normalize titles for matching
function normalizeTitle(title) {
    return title.toLowerCase()
        .normalize("NFKD")
        .replace(/[^\w\s]/g, " ")
        .replace(
            /\b(refurbished|renewed|used|pre owned|second hand|new|brand new|sealed|unlocked|smartphone|mobile phone|online|buy now|free delivery|free shipping|official)\b/g,
            " "
        )
        .replace(
            /\b(32|64|128|256|512|1024|2048)\s?gb\b/g,
            " "
        )
        .replace(/\b[0-9]{5,}\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


// Create product identity
function identity(item) {
    const title = item.title || "";

    const model = getModel(title);
    const storage = getStorage(title);
    const condition = getCondition(title);
    const category = item.category || categoryOf(title);

    const base = model || normalizeTitle(title);

    return [
        category,
        base,
        storage || "storage-unspecified",
        condition
    ].join("|");
}


// Group same product offers
function makeGroups(list) {
    const groups = new Map();

    list.forEach(item => {
        const key = identity(item);

        if (!groups.has(key)) {
            groups.set(key, []);
        }

        groups.get(key).push(item);
    });

    return [...groups.values()].map(group =>
        group.sort((a, b) => a.price - b.price)
    );
}


// Render comparison cards
function render() {
    const category = $("categoryFilter").value;
    const condition = $("conditionFilter").value;

    const filtered = offers.filter(item => {
        return (
            (category === "All" || item.category === category) &&
            (condition === "All" || item.condition === condition)
        );
    });

    let groups = makeGroups(filtered);

    const sort = $("sortFilter").value;

    if (sort === "low") {
        groups.sort(
            (a, b) => a[0].price - b[0].price
        );
    }

    if (sort === "high") {
        groups.sort(
            (a, b) => b[0].price - a[0].price
        );
    }

    if (sort === "name") {
        groups.sort(
            (a, b) => a[0].title.localeCompare(b[0].title)
        );
    }

    if (sort === "offers") {
        groups.sort(
            (a, b) => b.length - a.length
        );
    }

    results.innerHTML = "";

    if (!groups.length) {
        results.innerHTML = `
            <div class="empty">
                <strong>No matching offers.</strong>
                <p>Try another category or condition.</p>
            </div>
        `;

        $("summary").hidden = false;
        $("summary").textContent =
            "No offers match the selected filters.";

        $("status").textContent = "No matching products";

        return;
    }


    groups.forEach(group => {
        const best = group[0];
        const highest = group[group.length - 1];

        const spread = highest.price - best.price;

        const card = document.createElement("article");

        card.className = "comparison-card";


        // Product category and condition
        const top = document.createElement("div");

        top.className = "comparison-top";

        top.innerHTML = `
            <span class="best-tag">
                LOWEST FOUND OFFER
            </span>

            <span class="category-label">
                ${esc(best.category)} · ${esc(best.condition)}
            </span>
        `;


        // Product image
        const img = document.createElement("img");

        img.className = "product-photo";
        img.alt = best.title;
        img.src = best.image || "";

        if (!best.image) {
            img.hidden = true;
        }

        img.onerror = () => {
            img.hidden = true;
        };


        // Product title
        const title = document.createElement("h3");

        title.textContent = best.title;


        // Variant information
        const variant = document.createElement("p");

        variant.className = "variant-line";

        variant.textContent = [
            getStorage(best.title),
            best.condition !== "Unknown"
                ? best.condition
                : "Condition not specified"
        ].filter(Boolean).join(" · ");


        // Wishlist button
        const save = document.createElement("button");

        save.className = "save-button";

        function updateSaveLabel() {
            save.textContent = wishlist.has(best.title)
                ? "♥ Saved"
                : "♡ Save product";
        }

        updateSaveLabel();

        save.onclick = () => {
            if (wishlist.has(best.title)) {
                wishlist.delete(best.title);
            } else {
                wishlist.add(best.title);
            }

            persist();
            renderSaved();
            updateSaveLabel();
        };


        // Lowest price section
        const bestLine = document.createElement("div");

        bestLine.className = "best-line";

        const info = document.createElement("div");

        info.className = "best-price-info";

        info.innerHTML = `
            <small>Lowest listed price</small>
            <strong>${money(best.price)}</strong>
            <span>${esc(best.store || "Retailer")}</span>
        `;


        // Visit retailer
        const visit = document.createElement("a");

        visit.className = "retailer-link";
        visit.href = best.url || "#";
        visit.target = "_blank";
        visit.rel = "noopener noreferrer";
        visit.textContent = "Visit store";

        bestLine.append(info, visit);


        // Price difference
        const savings = document.createElement("div");

        savings.className = "savings-banner";

        savings.textContent = group.length > 1
            ? "Potential price difference across " +
              group.length + " offers: " + money(spread)
            : "Only one matching offer was returned. Try a broader search.";


        // Offer heading
        const heading = document.createElement("p");

        heading.className = "offers-heading";

        heading.textContent =
            "Compare " + group.length +
            " retailer offer" + (group.length === 1 ? "" : "s");


        // All retailer offers
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


        // Disclaimer
        const note = document.createElement("p");

        note.className = "saving-note";

        note.textContent =
            "Products are grouped by model, storage and condition " +
            "where identifiable. Confirm exact variant, seller, " +
            "delivery charges and final checkout price before buying.";


        card.append(
            top,
            img,
            title,
            variant,
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
        offers.length + " provider offers grouped into " +
        groups.length + " product listings. Grouping is conservative " +
        "to avoid mixing different variants or conditions.";

    $("status").textContent =
        offers.length + " offers across " +
        groups.length + " product groups";
}


// Search shopping offers
async function search(query) {
    const q = query.trim();

    if (!q) return;

    recent = [
        q,
        ...recent.filter(
            x => x.toLowerCase() !== q.toLowerCase()
        )
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
            .filter(item => Number(item.price) > 0)
            .map(item => ({
                ...item,
                price: Number(item.price),
                category: categoryOf(item.title || ""),
                condition: getCondition(item.title || "")
            }));

        $("categoryFilter").value = "All";
        $("conditionFilter").value = "All";

        if (!offers.length) {
            results.innerHTML =
                '<div class="empty">No priced offers returned. Try another search.</div>';

            $("status").textContent = "No offers found";

            return;
        }

        render();

    } catch (error) {
        offers = [];

        results.innerHTML = `
            <div class="empty">
                <strong>Could not load shopping results.</strong>
                <p>${esc(error.message)}</p>
                <p>Check backend and provider API key.</p>
            </div>
        `;

        $("status").textContent = "Search unavailable";
    }
}


// Search form
$("searchForm").addEventListener("submit", event => {
    event.preventDefault();
    search(searchInput.value);
});


// Filter events
$("categoryFilter").addEventListener("change", render);

$("sortFilter").addEventListener("change", render);

$("conditionFilter").addEventListener("change", render);


// Clear results
$("clearButton").onclick = () => {
    searchInput.value = "";
    offers = [];

    results.innerHTML = `
        <div class="empty">
            <strong>Your next great deal starts here.</strong>
            <p>Search for a product to compare available store offers.</p>
        </div>
    `;

    $("status").textContent = "Search to compare offers";
    $("summary").hidden = true;
};


// Initial setup
renderSaved();


// Check API configuration
fetch("/api/health")
    .then(response => response.json())
    .then(data => {
        if (!data.providerConfigured) {
            const warning = document.createElement("div");

            warning.className = "warning";

            warning.textContent =
                "Setup required: add your shopping provider API key to the backend .env file. No sample prices are shown.";

            document
                .querySelector(".products-section")
                .prepend(warning);
        }
    })
    .catch(() => {});
