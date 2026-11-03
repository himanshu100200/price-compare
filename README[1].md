# PriceCompare — Automatic Search Upgrade

This project replaces the hard-coded sample catalogue with shopping search results from Google Shopping via SerpApi. It preserves the dark purple UI, search, filters, sorting, wishlist and recent searches.

## Local setup (Windows)
1. Install Node.js LTS: https://nodejs.org/
2. Extract this ZIP and open the folder in VS Code.
3. Run `npm install` in the terminal.
4. Copy `.env.example` to `.env`.
5. Create a SerpApi account at https://serpapi.com/ and put your private key in `.env`:
   `SERPAPI_KEY=your_key`
6. Run `npm start`.
7. Open `http://localhost:3000`.

## Deployment
GitHub Pages only hosts static frontend files; it cannot run this Node backend or safely store a private API key. Deploy the entire folder to a Node-capable host (for example Render or Railway), set `SERPAPI_KEY` as a private environment variable, use `npm install` as build command and `npm start` as start command.

## Important limitations
- SerpApi is a third-party paid/freemium service; check current plans and usage terms.
- Results depend on Google Shopping coverage and are not guaranteed for every product or retailer.
- Prices/stock can change; verify final checkout price, delivery and availability.
- No retailer pages are scraped directly by this project.
- Flipkart offers an official affiliate API for registered affiliates: https://affiliate.flipkart.com/api-docs/af_overview.html
- Amazon India now documents Creators API; access requires Associates enrollment and eligibility: https://affiliate-program.amazon.in/creatorsapi/docs/en-us/introduction
- Amazon has specific price-display rules for comparison sites; review its terms before integrating Amazon prices: https://affiliate-program.amazon.in/help/operating/linking

## Files
`public/` contains the website. `server.js` securely proxies the shopping search API. Keep `.env` private and never upload it to GitHub.
