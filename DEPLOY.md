# Deployment — Plan B (free, persistent, secure)

Goal: host Lifelog permanently for **$0**, always-on, HTTPS, with E2E-encrypted data on a
persistent SQLite file. Architecture: one Docker container runs the Node server, which serves
both the built SPA **and** `/api` from a single origin — a TLS reverse proxy (Caddy) in front
handles HTTPS and proxies `:8787`. No CORS needed (same origin).

## 1. Get a free hostname
- Create a free subdomain, e.g. `lifelog.duckdns.org` (duckdns.org) or use `sslip.io`/`nip.io`.
  Point its **A record** at your server's public IP. (Caddy auto-issues the TLS cert, so you do
  **not** need a paid domain.)

## 2. Free VM — Oracle Cloud "Always-Free"
- Sign up for Oracle Cloud Free Tier. Create an **Always-Free** VM (Ubuntu 22.04, Ampere ARM or
  AMD; attach the free 200 GB block volume).
- In the VCN security list, open **ports 22, 80, 443** (inbound). Leave `:8787` closed to the
  public — only the proxy on the VM reaches it.
- SSH in. Install Docker + Compose:
  ```bash
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker $USER   # re-login after
  ```

## 3. Deploy the app
```bash
git clone <your-repo-url> lifelog && cd lifelog
cp .env.example .env
nano .env   # set the values below
docker compose up -d --build
```
`.env` (minimum for public hosting):
```
CORS_ORIGIN=https://lifelog.duckdns.org
APP_URL=https://lifelog.duckdns.org
PUBLIC_URL=https://lifelog.duckdns.org
TRUST_PROXY=1
# optional:
# SESSION_FROM=https://lifelog.duckdns.org   # lock session cookie origin
# SMTP_*, GOOGLE_*, GITHUB_*                 # enable verify/oauth
```
Data lives in the `lifelog-data` Docker volume (persists across restarts/rebuilds).

## 4. TLS reverse proxy — Caddy (on the VM host)
```bash
sudo apt-get install -y debian-keyring debian-archive-keyring curl
sudo curl -1sLf 'https://dl.cloudflare.me/gpg' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/caddy-keyring.gpg] https://dl.cloudflare.me/caddy/deb/ any-version main" | sudo tee /etc/apt/sources.list.d/caddy.list
sudo apt-get update && sudo apt-get install -y caddy
```
`/etc/caddy/Caddyfile`:
```
lifelog.duckdns.org {
    encode gzip
    reverse_proxy localhost:8787
}
```
```bash
sudo systemctl restart caddy && sudo systemctl enable caddy
```
Open `https://lifelog.duckdns.org` → sign up. Caddy obtained a Let's Encrypt cert automatically.

> Optional all-in-one: add the bundled `Caddyfile` as a `caddy` service in `docker-compose.yml`
> (publish 80/443, proxy `lifelog:8787`, set `CADDY_DOMAIN`). Then a single `docker compose up`
> brings up app + TLS. The standalone Caddy above is simpler to debug.

## 5. Updating
```bash
cd lifelog && git pull
docker compose up -d --build
```

## Security notes (public)
- TLS is mandatory; the Node server stays plain HTTP **behind** Caddy only.
- `:8787` is never exposed publicly (firewall 80/443 only).
- `CORS_ORIGIN` is locked to your exact HTTPS domain (others get `403`).
- `TRUST_PROXY=1` so the rate limiter keys off the real client IP.
- Habits are E2E-encrypted: the server stores ciphertext only; a DB leak yields nothing.
- Tokens are hashed at rest and short-lived (60 min access / 30 day refresh).
- Do **not** expose `vite dev` (its esbuild advisory). Use the production build served here.
- Optional: put Cloudflare in front for free WAF/DDoS protection.

## Quick local "from local to public" (no VM)
Run the app locally (`node server/index.js`, serves SPA + /api on `:8787`) and expose it with
Cloudflare Tunnel — free, no open ports, TLS-terminated:
```bash
cloudflared tunnel --url http://localhost:8787
```
(ngrok free works too, but weaker free tier.)
