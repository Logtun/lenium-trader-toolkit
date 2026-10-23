# Lenium Trader Toolkit

Two free, fan-made tools for [Lenium](https://www.lenium.capital/) ([@Lenium_Capital](https://x.com/Lenium_Capital)) traders, on one mobile-first page:

- **Payout calculator.** Pick YES or NO, a price (1–99¢) and a stake. It shows the implied probability, how many contracts you get, the payout, profit and return if you're right, the loss if you're wrong, and the win rate you need to break even. It includes the simulated exchange fee Lenium charges on every fill (0.07 × contracts × price × (1 − price), rounded up to the cent; toggle it off for "before any fees"). It flags prices outside Lenium's 20¢–80¢ opening range.
- **Evaluation tracker.** Pick a Lenium evaluation account ($5K, $10K, $25K, $50K, $75K or $100K) and see the 10% profit target, the 10% static floor, the 30-day window (60 with Double Time), the consistency limit, position and exposure caps in dollars. Enter your balance and day to get a progress bar, the distance to the floor and a status (On track / Close to floor / Target hit (simulated)), plus a shareable PNG progress card.

Rules as read from lenium.capital (Rules, Pricing, How It Works and the fee calculator) on Oct 23, 2026. Lenium's Rules page is always the final word.

- Static site: plain HTML, CSS and JavaScript. No backend, no build step, no API keys, no market data.
- Fan-made · Lenium accounts are simulated evaluation accounts · lenium.capital

made by [@iamlogtun](https://x.com/iamlogtun) · not official

## Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
2. **Import** this repo (`lenium-trader-toolkit`).
3. Framework preset: **Other**. Leave the build command and output directory empty.
4. **Deploy.**

## After you deploy: fix the link preview

X and WhatsApp need an absolute image URL. In `index.html`, change both `og:image` and `twitter:image` from `og.jpg?v=1` to your full Vercel address, e.g. `https://lenium-trader-toolkit.vercel.app/og.jpg?v=1`, and add
`<meta property="og:url" content="https://lenium-trader-toolkit.vercel.app/">`. Commit, and Vercel redeploys on its own.
