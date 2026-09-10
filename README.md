# Commodity Tracker

Next.js 大宗商品追踪网站。商品目录位于 `public/data/commodities.csv`，每个品种的最近一年日线位于 `public/data/commodities/{id}.csv`。

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Commodity data

- `npm run data:update`：从新浪财经公开行情接口更新全部品种。
- `npm run data:check`：检查每个 CSV 的字段、日期顺序、时效性和一年保留窗口。
- GitHub Actions 每天自动执行更新；没有新行情时不会提交文件，也可在 Actions 页面手动触发。

美联储概率保存在 `public/data/macro/fed-rate-probability.csv`。最新快照来自第三方基于 CME Fed Funds 期货和 FRED 利率区间的独立计算，金十公开页面用于补充历史记录。该数据并非 CME 官方付费 API，页面始终显示快照日期和来源链接。

煤炭使用大商所焦煤主力连续；汽油使用上期所燃料油主力作为成本代理，页面中会明确显示。

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
