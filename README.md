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
| Domain | smartnextmovenow.tech |

## Run locally

```bash
cp .env.example .env   # fill in keys
npm install
npm run dev            # API on :4000, web on :5173
```

## Deploy (Vultr)

On a fresh Ubuntu VM, as root:

```bash
git clone https://github.com/krishb111/carfinanceapp.git && cd carfinanceapp
bash deploy/setup.sh          # installs Docker, opens ports 80/443
nano .env                     # paste the same keys as local .env
echo "DOMAIN=smartnextmovenow.tech" >> .env   # once DNS points at the VM
bash deploy/deploy.sh         # builds and starts app + Caddy (auto HTTPS)
```

Without `DOMAIN`, the app is served over plain HTTP at the VM's IP.
