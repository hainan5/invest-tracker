<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Commodity Tracker repository guide

## Project overview

- This is a Chinese-language commodity market dashboard built with Next.js 16, React 19, TypeScript, and Tailwind CSS 4.
- The site tracks energy, metals, chemicals, agricultural products, and Fed rate probabilities.
- Market data is stored as local CSV files and loaded synchronously by Server Components. Do not move CSV loading into the browser without a clear requirement.
- Displayed market values must come from a documented real-data source. Never silently substitute mock, stale, or fabricated values.

## Important paths

- `src/app/page.tsx`: server entry point; loads CSV data and passes it to the dashboard.
- `src/components/dashboard.tsx`: main interactive dashboard.
- `src/components/mini-chart.tsx`: commodity price chart and hover details.
- `src/components/fed-rate-card.tsx`: Fed probability card and history chart.
- `src/lib/commodity-csv.ts`: commodity catalog and OHLC CSV parser.
- `src/lib/fed-rate-csv.ts`: Fed probability CSV parser.
- `src/lib/commodities.ts`: shared types, category metadata, and price formatting.
- `public/data/commodities.csv`: commodity catalog and provider mapping.
- `public/data/commodities/{id}.csv`: one year of daily OHLCV data per commodity.
- `public/data/macro/fed-rate-probability.csv`: Fed probability history.
- `scripts/update-commodity-data.mjs`: commodity fetcher, validator, and rolling-window writer.
- `scripts/update-fed-probability.mjs`: Fed probability updater and validator.
- `.github/workflows/update-commodity-data.yml`: daily update workflow (23:15 UTC / 07:15 Beijing time).

## Common commands

- Install exact dependencies: `npm ci`
- Start development: `npm run dev`
- Lint: `npm run lint`
- Production build: `npm run build`
- Update all external data: `npm run data:update`
- Validate all local data: `npm run data:check`
- Commodity-only update/check: `npm run data:update:commodities` / `npm run data:check:commodities`
- Fed-only update/check: `npm run data:update:fed` / `npm run data:check:fed`

## Data contracts

### Commodity catalog

`public/data/commodities.csv` must keep this exact header and order:

`id,name,subtitle,symbol,category,unit,color,provider,provider_symbol,insight`

- `id` must be unique kebab-case matching `^[a-z0-9-]+$`; its history file must be `{id}.csv`.
- `category` must be one of `能源商品`, `金属商品`, `化工商品`, or `农副产品`.
- `provider` must currently be `sina-global` or `sina-domestic`.
- Use `subtitle` and `insight` to disclose continuous contracts, proxy instruments, delayed sources, or other limitations.
- Quote CSV fields containing commas; keep files UTF-8 encoded.

### Commodity history

Every `public/data/commodities/{id}.csv` must use this exact header:

`date,open,high,low,close,volume`

- Dates use `YYYY-MM-DD`, are unique, and are sorted ascending.
- OHLCV fields must be finite numeric values; valid close prices must be positive.
- Keep only the rolling last year and at least two rows so price change can be calculated.
- The latest row must remain within the freshness limits enforced by the update script.
- Do not hand-edit generated history unless repairing verified source data; prefer the update script.

### Fed probability history

`public/data/macro/fed-rate-probability.csv` must keep this exact header:

`date,meeting,hike,hold,cut,source_url`

- Probabilities are percentages and should total approximately 100 as enforced by the validator.
- Preserve the source URL and snapshot date. The live value is independently calculated from Fed Funds futures and is not CME's official API; never present it as official CME data.

## Adding or changing a commodity

1. Verify the upstream provider symbol returns a current daily series; do not guess symbols.
2. Add the catalog row in `public/data/commodities.csv`.
3. If introducing a category, update both `CommodityCategory`/`categoryInfos` in `src/lib/commodities.ts` and `validCategories` in `src/lib/commodity-csv.ts`.
4. Run `npm run data:update:commodities` immediately to create the matching history CSV.
5. Run `npm run data:check`, `npm run lint`, and `npm run build`.
6. Confirm the product name, source disclosure, latest date, and exact chart values in the rendered page.

Do not leave the catalog committed or served without its matching history file: the server loader intentionally fails on a missing CSV. When adding a product while `next dev` is running, generate the history file before refreshing the page, or restart the dev server afterward to clear a stale error overlay.

## Implementation conventions

- Read the relevant local Next.js guide under `node_modules/next/dist/docs/` before changing Next.js APIs or configuration.
- Keep server-side filesystem access in `src/lib`; pass serializable data into Client Components.
- Maintain strict TypeScript types and the `@/*` import alias.
- Preserve the existing Chinese UI copy and responsive behavior unless the task explicitly changes them.
- Reuse existing chart, icon, formatting, and color conventions before adding new abstractions.
- Avoid new dependencies unless they provide clear value; use the package manager for all dependency changes.
- Treat upstream responses as untrusted: validate schema, numeric fields, ordering, freshness, and empty results before replacing CSV files.
- Data writes must remain atomic. Existing scripts write a temporary file and rename it; preserve this behavior.
- An unavailable source must fail the update and retain old files rather than writing empty or synthetic data.

## Validation and Git hygiene

- UI or parser changes: run `npm run lint` and `npm run build`.
- CSV/catalog-only changes: run `npm run data:check`; also build when catalog metadata or product count changes.
- Update-script changes: run the narrow check first, then the full data check. Network-backed updates may modify many generated CSV files, so inspect the diff before committing.
- For rendered behavior, smoke-test the home page and verify an HTTP 200 plus the affected Chinese labels/data.
- Do not commit `.next`, temporary CSV files, logs, or editor artifacts.
- Preserve unrelated working-tree changes. Daily generated CSV updates and hand-written code changes should be separated when practical.
- Never expose credentials in source, commands, logs, workflow files, or data-source URLs.
