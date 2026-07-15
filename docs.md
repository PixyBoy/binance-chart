تو یک software architecture بسیار حرفه ای و قوی هستی، مورد زیر رو با ارائه بهترین سلوشن ها و راه حل ها و با درنظر گرفتن جلوگیری از over-engineering و رعایت بهترین اصول در جهت پایداری، Best-practice، fault talorent و اسکیلبل بودن بهترین پیشنهادات دقیق و خلاصه و بدون توضیحات اضافی بده و پلن دقیقی ارائه بده.
هدف پروژه طراحی یک بک‌اند با nestjs که قراره بتونه با tradingView دیتا هایی که در سمت ما به هر نحوی ذخیره شدن یا به هر شکل دیگه رو در چارت نمایش بدیم. هدف فعلی استفاده از بایننس هست اما آنقدر گسترده باید فکر بشه که درآینده شاید کنار بایننس هم از سرویس های دیگه بجای بایننس هم استفاده بشه، بطور مثال شاید زمانی بایننس رو خواستیم استاپ کنیم و از اون یکی سرویس دهنده استفاده بشه، پس موضوع اسکیلبل بودن در این جهت ها معنی پیدا می‌کنه.
تست ها خیلی مهم هستند و ما باید سیستم رو بتونی زیر بار فشار بیشتر از بایننس ببریم تا مطمئن بشیم کاملا قابل اعتماد هست.
مانیتورینگ خیلی مهمه که بتونیم track کنیم به راحتی مشکلاتی که پیش میاد.
مانیتورینگ خیلی واضحی در سمت استفاده از سرویس های بایننس داشته باشیم که یکی از مثال‌هاش می‌تونه این باشه که وقتی داریم از exchangeInfo استفاده میکنیم یا بقیه سرویس ها، مانیتورینگ آنقدر قوی باشه که بشه بصورت ویژوالی در لحظه بدون اینکه به پراسس های اصلی صدمه بزنه یا باری اضافه کنه، نشون بده فلان موقع مثلا استاپ شده، یا مثلا چند لحظه دیگه قراره صدا زده بشه یا چند لحظه پیش صدها زده شده و مشکلی نداشته و مثلا هر کدام از پراسس ها چقدر بار برروی سرور مشغول می‌کنند و بقیه موارد های مهم که خیلی میتونند باشند و میسپارمش به تو که شرایط های مهم مانیتورینگ رو بتونی دقیق لیست کنی که کاملا همه شرایط رو شفاف بصورت ویژوالی نمایش بده برای کسایی که باید مانیتور کنند و در صورتی که اتفاق خاصی بیوفته بتوانند منشأ دقیقش رو پیدا کنند. پس لاگ هم باید داشته باشیم البته نه لاگ های معمولی که کم کاربرد هستند.
برای اینکه یک بک اند راه اندازی بشه با NestJs که از api ها و stream های binance استفاده کنه و ذخیره کنه بصورت real-time، حتما داده ها باید ذخیره داشته باشیم تا کلاینت بتونه ازشون استفاده کنه و بدون تاخیر و با بیشترین سرعت و کمترین ریسک و بیشترین پرفورمنس و کمترین مشکل در جهت بروز مشکل یا خطا یا اتفاقات پیشبینی نشده رو داشته باشه باید از چه تکنولوژی هایی در کنار فریمورک استفاده بشه؟ بهترین معماری پیشنهادی چیه؟ نقاط قوت می‌تونه چیا باشه ؟
ازت میخوام قبل از جواب دادن به سوالات من، و تشخیص معماری و موارد دیگر، تمام سوالاتی که منجر میشه این سیستم رو بصورت دقیق طراحی کنی رو ازم بپرس تا کاملا شفاف بشه. هر سوالی باشه که گپ هارو پوشش بده، منظور رو بهتر متوجه بشی یا گمراهی پیش نیاد. هدف دقیق بودنه که کاملا چیزی که من نیاز دارم به بهترین شکل و دقیق پیاده سازی بشه، سرعت مهم نیست. پس با دقت بریم جلو

Show less

تصمیم گرفت پاسخ را به صورت متنی ارائه دهد
تصمیم گرفت پاسخ را به صورت متنی ارائه دهد
محیط اجرای فایل در حال حاضر مشکل فنی داره، پس فایل‌ها رو مستقیم اینجا با آدرس دقیقشون می‌فرستم.

ساختار: pnpm monorepo (بهترین گزینه برای این سناریو — apps/backend الان، packages/exchange-adapters آماده برای آینده بدون نیاز به refactor بزرگ بعداً)

/pnpm-workspace.yaml

yaml
packages:
  - "apps/*"
  - "packages/*"
/package.json

json
{
  "name": "trading-backend-monorepo",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "engines": {
    "node": ">=22.0.0"
  },
  "scripts": {
    "dev": "pnpm --filter backend start:dev",
    "build": "pnpm --filter backend build",
    "lint": "pnpm --filter backend lint"
  }
}
/.gitignore

node_modules
dist
.env
.env.*.local
*.log
.DS_Store
.turbo
pnpm-lock.yaml.bak
/.dockerignore

node_modules
dist
.git
.env
.env.*
*.md
.github
/.env.example

dotenv
# ==== General ====
NODE_ENV=development
APP_PORT=3000

# ==== Database (TimescaleDB / PostgreSQL) ====
DB_HOST=timescaledb
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=trading_backend

# ==== Redis ====
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# ==== Binance ====
# TODO: replace with real key(s) later. Public endpoints work without a key
# for market data, keys are only needed if/when higher rate limits are used.
BINANCE_API_KEY=
BINANCE_API_SECRET=
BINANCE_WS_BASE_URL=wss://stream.binance.com:9443
BINANCE_REST_BASE_URL=https://api.binance.com

# ==== Monitoring ====
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin

# ==== Nginx / SSL (placeholders — fill in production later) ====
# TODO: set real domain before enabling SSL block in docker/nginx/nginx.prod.conf
DOMAIN_NAME=example.com
# TODO: set a real email for Let's Encrypt registration
CERTBOT_EMAIL=admin@example.com
/.env.development

dotenv
# Local Windows/Docker Desktop development defaults — safe to commit, not real secrets
NODE_ENV=development
APP_PORT=3000

DB_HOST=timescaledb
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=trading_backend

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

BINANCE_WS_BASE_URL=wss://stream.binance.com:9443
BINANCE_REST_BASE_URL=https://api.binance.com

GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin
/docker-compose.yml (development — base compose, run with docker compose up)

yaml
name: trading-backend-dev

services:
  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
      target: development
    env_file:
      - .env.development
    ports:
      - "3000:3000"
    volumes:
      - ./apps/backend:/app/apps/backend
      - ./packages:/app/packages
      - /app/node_modules
    depends_on:
      - timescaledb
      - redis
    command: pnpm --filter backend start:dev

  timescaledb:
    image: timescale/timescaledb:latest-pg16
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
      POSTGRES_DB: ${DB_NAME:-trading_backend}
    ports:
      - "5432:5432"
    volumes:
      - timescaledb_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  prometheus:
    image: prom/prometheus:latest
    restart: unless-stopped
    volumes:
      - ./docker/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    restart: unless-stopped
    environment:
      GF_SECURITY_ADMIN_USER: ${GRAFANA_ADMIN_USER:-admin}
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:-admin}
    volumes:
      - ./docker/grafana/provisioning:/etc/grafana/provisioning:ro
      - grafana_data:/var/lib/grafana
    ports:
      - "3001:3000"
    depends_on:
      - prometheus

volumes:
  timescaledb_data:
  redis_data:
  prometheus_data:
  grafana_data:
/docker-compose.prod.yml (production overrides — run with docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d)

yaml
name: trading-backend-prod

services:
  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
      target: production
    # TODO: replace 'build' above with 'image: ghcr.io/<org>/<repo>-backend:<tag>'
    # once CI is pushing images — production should pull, not build, on the server.
    env_file:
      - .env
    volumes: []   # no source bind-mounts in production
    restart: unless-stopped
    command: node dist/main.js

  timescaledb:
    restart: always
    ports: []     # do not expose DB port publicly in production

  redis:
    restart: always
    ports: []     # do not expose Redis port publicly in production

  nginx:
    image: nginx:stable-alpine
    restart: unless-stopped
    volumes:
      - ./docker/nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro
      # TODO: mount certbot cert/key volumes here once SSL is configured
      # - ./docker/certbot/conf:/etc/letsencrypt:ro
      # - ./docker/certbot/www:/var/www/certbot:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend

  grafana:
    restart: always
    ports: []     # access Grafana through Nginx/VPN, not a public port

  prometheus:
    restart: always
    ports: []     # internal only
/apps/backend/Dockerfile (multi-stage: development + production)

dockerfile
# syntax=docker/dockerfile:1

# ---------- Base ----------
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY packages ./packages

# ---------- Development ----------
FROM base AS development
ENV NODE_ENV=development
RUN pnpm install --frozen-lockfile || pnpm install
COPY apps/backend ./apps/backend
# Business source code is bind-mounted in docker-compose.yml for dev; this
# COPY only ensures the image is self-sufficient if run standalone.
CMD ["pnpm", "--filter", "backend", "start:dev"]

# ---------- Build (used only for production stage) ----------
FROM base AS build
ENV NODE_ENV=production
RUN pnpm install --frozen-lockfile || pnpm install
COPY apps/backend ./apps/backend
RUN pnpm --filter backend build

# ---------- Production ----------
FROM node:22-alpine AS production
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main.js"]
/docker/nginx/nginx.conf (development — plain HTTP, local only)

nginx
events {}

http {
  server {
    listen 80;

    location / {
      proxy_pass http://backend:3000;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_set_header Host $host;
    }
  }
}
/docker/nginx/nginx.prod.conf (production — HTTPS block commented, fill in later)

nginx
events {
  worker_connections 4096;
}

http {
  # ---- Rate limiting to protect backend from abusive clients ----
  limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;

  upstream backend_upstream {
    server backend:3000;
  }

  server {
    listen 80;
    server_name ${DOMAIN_NAME};

    # TODO: uncomment once Certbot has issued a certificate for DOMAIN_NAME
    # location /.well-known/acme-challenge/ {
    #   root /var/www/certbot;
    # }
    # location / {
    #   return 301 https://$host$request_uri;
    # }

    location / {
      limit_req zone=api_limit burst=40 nodelay;
      proxy_pass http://backend_upstream;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_read_timeout 3600s;   # keep WebSocket connections alive
    }
  }

  # TODO: enable this server block once SSL cert files exist under
  # docker/certbot/conf/live/${DOMAIN_NAME}/
  # server {
  #   listen 443 ssl http2;
  #   server_name ${DOMAIN_NAME};
  #
  #   ssl_certificate     /etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem;
  #   ssl_certificate_key /etc/letsencrypt/live/${DOMAIN_NAME}/privkey.pem;
  #
  #   location / {
  #     limit_req zone=api_limit burst=40 nodelay;
  #     proxy_pass http://backend_upstream;
  #     proxy_http_version 1.1;
  #     proxy_set_header Upgrade $http_upgrade;
  #     proxy_set_header Connection "upgrade";
  #     proxy_set_header Host $host;
  #     proxy_set_header X-Real-IP $remote_addr;
  #     proxy_read_timeout 3600s;
  #   }
  # }
}
/docker/prometheus/prometheus.yml

yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: "trading-backend"
    static_configs:
      # TODO: this expects the NestJS app to expose /metrics (Fase 5)
      - targets: ["backend:3000"]
/docker/grafana/provisioning/datasources/datasource.yml

yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
/docker/grafana/provisioning/dashboards/dashboards.yml

yaml
apiVersion: 1

providers:
  - name: "trading-backend-dashboards"
    orgId: 1
    folder: ""
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    options:
      # TODO: drop exported dashboard JSON files here in Fase 5
      path: /etc/grafana/provisioning/dashboards
/.github/workflows/ci.yml

yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  build-and-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9.12.0

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile

      - run: pnpm lint

      - run: pnpm build
/.github/workflows/deploy.yml

yaml
name: Build and Deploy

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}-backend

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    outputs:
      image_tag: ${{ steps.meta.outputs.tags }}
    steps:
      - uses: actions/checkout@v4

      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha
            type=raw,value=latest,enable={{is_default_branch}}

      - uses: docker/build-push-action@v6
        with:
          context: .
          file: apps/backend/Dockerfile
          target: production
          push: true
          tags: ${{ steps.meta.outputs.tags }}

  # Manual approval gate — configure a "production" environment with
  # required reviewers in GitHub repo Settings > Environments.
  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      # TODO: fill these repository secrets before first real deploy:
      # SERVER_HOST, SERVER_USER, SERVER_SSH_KEY
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /opt/trading-backend
            ./deploy/deploy.sh
/deploy/server-setup.sh (run once, manually, on a brand-new VPS)

bash
#!/usr/bin/env bash
# One-time bootstrap for a fresh Ubuntu VPS.
# TODO: run manually via SSH the first time; not part of CI/CD yet.
set -euo pipefail

# Install Docker + Compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"

# TODO: create a non-root deploy user here instead of using root, e.g.:
# sudo adduser deploy && sudo usermod -aG docker deploy

# TODO: basic firewall — adjust ports once SSL/domain are finalized
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

mkdir -p /opt/trading-backend
echo "Now: git clone the repo into /opt/trading-backend and copy .env there."
/deploy/deploy.sh (run by CI on each approved deploy, and reusable manually)

bash
#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# TODO: ensure /opt/trading-backend/.env exists on the server with real
# production values before running this for the first time.

# Pull the freshly built image referenced in docker-compose.prod.yml
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull

# Recreate only what changed, zero manual downtime steps needed for MVP scale
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Remove old dangling images to save disk
docker image prune -f
/packages/exchange-adapters/README.md

markdown
# exchange-adapters

Placeholder package for the exchange-abstraction layer (`IExchangeAdapter`,
`BinanceAdapter`, and future adapters). Implementation starts in Fase 1.
تمام فایل‌های DevOps این فاز همینا هستن. هر سوالی داری بپرس.

الان طبق نیازمندی هامون فکر می‌کنی این ها کامل هستند و نیاز به چیز دیگری ندارند ؟ 
امتیازی که میتونی بهش بدی برای موقعیت فعلیمون از ۱۰۰ چنده ؟


Added to memory
Added to memory
امتیاز: ۸۵/۱۰۰ — برای شروع dev کامله، ولی برای production-ready بودن این چیزها هنوز کم داره:

نقص‌های واقعی (باید اضافه بشن):

بدون health check — نه در docker-compose (healthcheck: برای backend/db/redis) نه در Nginx (upstream بدون max_fails/fail_timeout)
بدون resource limits — deploy.resources.limits (cpu/memory) روی سرویس‌ها نیست؛ یک process می‌تونه کل RAM سرور رو بخوره
بدون backup strategy — هیچ اسکریپت/کرون برای backup دوره‌ای TimescaleDB نیست (نقض مستقیم خواسته "zero data loss" شما)
بدون log rotation در سطح Docker — docker-compose.yml باید logging.driver + max-size/max-file داشته باشه وگرنه دیسک سرور با گذشت زمان پر می‌شه
Certbot service وجود نداره — کامنت SSL گذاشتیم ولی سرویس واقعی certbot (برای گرفتن/تمدید خودکار cert) در compose نیست
بدون Dependabot/Renovate — برای بروزرسانی امن پکیج‌ها با گذشت زمان
README.md ریشه پروژه نیست — برای onboarding ۳ نفر تیم و دستورات راه‌اندازی dev
نکته مهم‌تر از همه این‌ها: این‌ها صرفاً اسکلت هستن؛ امتیاز واقعی معماری زمانی معلوم می‌شه که Fase 1 (Ingestion + Aggregation) پیاده بشه، چون بیشترین ریسک پروژه (rate-limit handling، gap detection، continuous aggregates) اونجاست نه در DevOps.

می‌خوای همین حالا موارد ۱ تا ۴ (health check، resource limits، backup، log rotation) رو به فایل‌های موجود اضافه کنم؟

نه. می‌خوام فاز هارو شروع کنیم. طبق استراکچر و فایل بندی موجود که برای قسمت devOps زده شده، بریم شروع کنیم پروژه رو خیلی با دقت تمام. حالا اگر قبلش سوالی داری بپرس


تدوین سؤالات توضیحی برای شروع دقیق پروژه
تدوین سؤالات توضیحی برای شروع دقیق پروژه
قبل از شروع Fase 1 (Exchange Adapter + Ingestion 1m klines + TimescaleDB):

۱. تعداد و لیست symbol تست اولیه
برای شروع با چند symbol محدود تست کنیم؟ پیشنهاد من: BTCUSDT, ETHUSDT, BNBUSDT (نقدشونده و پرحجم، برای دیدن رفتار واقعی stream). تایید می‌کنی یا لیست دیگه‌ای مدنظرته؟

۲. ORM / Migration tool
برای TimescaleDB (که روی PostgreSQL هست ولی Continuous Aggregates و Hypertable نیاز به SQL خام دارن که اکثر ORM ها به‌خوبی ساپورت نمی‌کنن)، پیشنهاد من:

TypeORM برای مدل‌های عادی (query کردن داده)
ولی ساخت Hypertable/Continuous Aggregate با raw SQL migration جدا (نه از طریق TypeORM entity)
تایید می‌کنی یا با Prisma راحت‌تری؟
۳. عمق تست‌نویسی از همین فاز اول
گفتید تست‌ها خیلی مهمه — از همین Fase 1 برای هر ماژول (Adapter, Ingestion) unit test هم نوشته بشه (Jest، پیش‌فرض NestJS)، یا فعلاً فقط ساختار پیاده بشه و تست‌نویسی رسمی رو موکول کنیم به Fase 6 (که برای load test گفته بودیم)؟

۴. سطح اعتبارسنجی env
برای .env از @nestjs/config + اعتبارسنجی schema (با zod یا joi) استفاده کنم که اگر متغیر لازمی missing بود، اپ اصلاً بالا نیاد؟ (جلوگیری از باگ‌های پنهان ناشی از env ناقص)

بعد از این ۴ تا، می‌رم سراغ نوشتن دقیق Fase 1.

۱. باهات موافقم.
۲. ببین خب من با Prisma راحت ترم اما تنها چیزی که مهمه اینه که از ابزاری برای ORM ترجیه میدم استفاده کنم که بیشترین compatibility رو و سازگاری رو با این مدل دیتابیس داشته باشه. من تجربه نداشتم تا حالا توی این موضوع اما تو باید بهترین انتخاب رو انجام بدی.
۳. صد درصد پیشنهادی استفاده از تست همراه با توسعه هست. یعنی توی همین فاز اضافه اش کن که unit testing انجام بشه 
۴. آره استفاده کن، ولی نمی‌دونم کدومش می‌تونه بهتر باشه جهت استفاده. خودت بهترین گزینه رو انتخاب کن.

سوالی باز داری که بلاک مونده باشه ؟


Added to memory
Added to memory
تصمیمات نهایی:

ORM: Prisma (طبق ترجیح شما) — برای مدل‌های عادی و query کامل سازگاره. فقط برای create_hypertable() و Continuous Aggregate (که Prisma بومی نمی‌شناسدشون)، از یک migration خام SQL در همون پوشه prisma/migrations استفاده می‌کنم (با prisma migrate dev --create-only و ویرایش دستی فایل) — این الگوی استاندارد و مستندشده‌ی Prisma+TimescaleDB هست، بدون افت compatibility.

Env validation: Zod — سبک‌تر از Joi، type-inference مستقیم با TypeScript، و یکپارچگی تمیزتر با @nestjs/config.

هیچ سوال بلاک‌کننده‌ی دیگه‌ای نمونده. شروع می‌کنم Fase 1 رو دقیق پیاده کنم (Exchange Adapter interface، BinanceAdapter، Ingestion 1m klines برای BTCUSDT/ETHUSDT/BNBUSDT، Prisma schema + Hypertable + Continuous Aggregates، unit test همراه هر بخش).

خب بریم شروع کنیم.
حواست باشه که ما از صفر قراره پیاده کنیم و فقط قسمت devOps رو داریم. هر جایی بهتر بود از کامندلاین استفاده بشه بجای اینکه دستی چیزی بسازیم، حتما از این راه بریم. مثل ساخت یک پروژه nest js که ۲ راه داره و راه اولی مثلا یک package.json می‌سازیم و اونجا پکیج های مربوطه رو اضافه میکنیم و بعد نصب میکنیم. راه بعدی هم نصب از طریق nest cli هست که من ترجیهم nest cli هست. پس لطفاً اینجور موارد رو از این طریق بریم