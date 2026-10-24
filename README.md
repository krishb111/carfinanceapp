# Smart Next Move

A lease-end and life-event advisor for Toyota drivers. It compares buying out, re-leasing, trading in, keeping the car, or going flexible (subscription / usage-based), grounded in real cash flow and live vehicle prices.

| Piece | Tech |
| --- | --- |
| Next-move advisor | Toyota track |
| Bank balances & spending | Capital One Nessie API |
| Live prices, inventory, trade-in | SerpApi |
| Payment & price history | Tiger Data (TimescaleDB) |
| Plain-language explanations | Gemini |
| Hosting | Vultr |
| Domain | smartnextmove.tech |

## Run locally

```bash
cp .env.example .env   # fill in keys
npm install
npm run dev            # API on :4000, web on :5173
```
