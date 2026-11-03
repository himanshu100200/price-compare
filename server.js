
const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;

// Serve frontend files
app.use(express.static(path.join(__dirname, "public")));

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        ok: true,
        providerConfigured: Boolean(process.env.SERPAPI_KEY)
    });
});

// Product search API
app.get("/api/search", async (req, res) => {

    const query = String(req.query.q || "").trim();

    if (!query) {
        return res.status(400).json({
            error: "Please enter a product name."
        });
    }

    if (query.length > 120) {
        return res.status(400).json({
            error: "Search query is too long."
        });
    }

    if (!process.env.SERPAPI_KEY) {
        return res.status(503).json({
            error: "Shopping API key is missing."
        });
    }

    try {

        const params = new URLSearchParams({
            engine: "google_shopping",
            q: query,
            gl: "in",
            hl: "en",
            api_key: process.env.SERPAPI_KEY
        });

        const apiURL =
            "https://serpapi.com/search.json?" + params.toString();

        const response = await fetch(apiURL);

        const data = await response.json();

        if (!response.ok || data.error) {
            console.error("SerpApi error:", data.error);

            return res.status(502).json({
                error: data.error || "Shopping provider error."
            });
        }

        // Convert provider response into frontend format
        const results = (data.shopping_results || [])
            .map(item => ({
                title: item.title || "Product",

                price: Number(item.extracted_price),

                store: item.source || "Retailer",

                url: item.product_link || item.link || "",

                image: item.thumbnail || ""
            }))
            .filter(item =>
                Number.isFinite(item.price) &&
                item.price > 0 &&
                item.url
            );

        res.json({
            query: query,
            results: results,
            provider: "Google Shopping via SerpApi",
            fetchedAt: new Date().toISOString()
        });

    } catch (error) {

        console.error("Shopping search failed:", error);

        res.status(500).json({
            error: "Unable to contact shopping provider."
        });
    }

});

// Start server
app.listen(PORT, () => {
    console.log(`PriceCompare running on port ${PORT}`);
});
