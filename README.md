# nav-pro-adminpanel

The admin panel for the Parts Finder store: orders and tracking, products and
prices, sales and profit, marketing spend and delivery rates.

It is a Next.js app that talks to the store API (`nav-pro-listing`) from its
server. The browser never sees the API token.

## Run it locally

1. Build and run the store API (`npm run api` in `nav-pro-listing`).
2. Copy `.env.example` to `.env.local` and fill it in.
3. `npm install`, then `npm run dev`, and open http://localhost:3010.

See `docs/plan.md` for what is built and what comes next, and `CLAUDE.md` for
how the code is laid out.
