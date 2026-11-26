# Little Corner — Teacher Portfolio

A responsive teacher portfolio and resource library with a protected admin studio. The React/TypeScript frontend uses a CodeIgniter 3 (PHP) API and MySQL database. Five templates all render the same teacher profile and published content.

## Run locally

Requirements: Node.js 20.19+, PHP 7.4+ with `mysqli`, `fileinfo`, and `iconv` extensions, Composer, and Docker (or a MySQL 8+ server).

```sh
npm install
composer install
cp .env.example .env
docker compose up -d db
npm run setup
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) for the public site and [http://localhost:5173/admin](http://localhost:5173/admin) for the teacher studio.

`npm run setup` applies the idempotent initial schema and creates the sample portfolio and demo account:

- Email: `teacher@example.com`
- Password: `ChangeMe123!`

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` before setup to seed a different account. Existing accounts are not reset. Change the demo password before exposing the app to a network.

## Build and production

```sh
npm run typecheck
npm run build
composer install --no-dev --optimize-autoloader
```

Deploy the PHP API through Apache/PHP-FPM or another production PHP server; `npm start` is only for local development. Serve `dist/client` as static files and proxy `/api` and `/uploads` through the same origin to the PHP app. Set a strong `SESSION_SECRET` of at least 32 characters, a production `DATABASE_URL`, and `APP_ENV=production`. The app refuses to start in production with a missing or short session secret. Keep `UPLOAD_DIR` on persistent storage and configure HTTPS at the reverse proxy so secure session cookies can be used.

## What is included

- **Public portfolio:** profile, education, experience, subjects, expertise, achievements, testimonials, photo gallery, announcements, contact form, social links, and a searchable/filterable resource library.
- **Teacher studio:** overview analytics, portfolio editor, image/document uploads, content CRUD, categories, scheduling, SEO fields, inbox, design controls, template selection, draft preview, publishing, and reset.
- **Templates:** Modern Professional, Academic Classic, Creative Educator, Minimal Portfolio, and Premium Education. Template/design drafts publish separately; switching the design never changes portfolio or content records.
- **Authentication:** bcrypt password hashes, HTTP-only SameSite session cookies stored in MySQL, rate-limited login, and protected `/api/admin/*` routes.
- **Uploads:** images, PDF and Word documents; configurable size limit (`MAX_UPLOAD_MB`, 10 MB by default). Uploaded image files are listed in the teacher's gallery. Adjust PHP's `upload_max_filesize` and `post_max_size` settings when raising this limit.
- **Database:** `migrations/001_initial.sql` creates the user, portfolio, content, category, media, settings, messages, and analytics tables. The migration is safe to rerun.

## Environment

Copy `.env.example` to `.env` and configure:

| Variable | Purpose |
| --- | --- |
| `PORT` | PHP development/API port |
| `APP_ENV` | `development` or `production` |
| `DATABASE_URL` | MySQL connection string |
| `SESSION_SECRET` | Session encryption key; use a random 32+ character value in production |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Initial demo administrator credentials |
| `UPLOAD_DIR` | Persistent upload directory |
| `MAX_UPLOAD_MB` | Maximum upload size |

`npm run dev` starts Vite and PHP's built-in development server. Vite proxies `/api` and `/uploads` to the CodeIgniter backend on port `3001` by default. For direct backend requests, use `http://localhost:3001/api/health`.
