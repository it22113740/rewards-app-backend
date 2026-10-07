# Haunt Rewards API

NestJS backend for a location-based rewards app for restaurants and bars. Owners publish venues and perks. Users earn points by uploading photos and videos at those venues, then redeem the points for offers.

This repository is the API only. The Expo client talks to it over HTTP.

## How it works

Two roles share one user table.

**Owners** register, complete onboarding, and create venues (name, address, map location, geofence radius, and image). Each venue sets how many points a photo or video is worth and lists perks such as a discount, a free meal, or another offer. Owners review submissions and mark redeemed promo codes as used.

**Users** upload photos or videos at a venue. Approved uploads add points to that user’s balance for that venue. Users spend those points to redeem a perk and receive a promo code.

Media (profiles, venues, perks, submissions) is stored on Cloudinary. Auth is JWT. Password-reset OTPs are emailed through Brevo SMTP. A geofence check can notify a user when they are inside a venue radius.

## Stack

- NestJS 11, TypeScript
- PostgreSQL with Prisma
- JWT (Passport)
- Cloudinary, Nodemailer (Brevo SMTP)
- Swagger at `/api`

## Setup

Requires Node.js and a Postgres database (Neon or local).

```bash
npm install
cp .env.example .env
```

Set `DATABASE_URL` in `.env`. The API exits on startup if it is missing. Then apply migrations and start the server:

```bash
npm run prisma:migrate
npm run start:dev
```

The server listens on `PORT` (default `3000`). Interactive docs: [http://localhost:3000/api](http://localhost:3000/api).

## Scripts

| Command | Description |
| --- | --- |
| `npm run start` | Start once |
| `npm run start:dev` | Start with reload |
| `npm run start:prod` | Run `dist/src/main` (after `npm run build`) |
| `npm run build` | Compile |
| `npm run prisma:migrate` | Apply Prisma migrations in development |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm test` | Unit tests |
| `npm run test:e2e` | End-to-end tests |

## Environment

See `.env.example`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string |
| `JWT_SECRET` | Yes | Signing key for access tokens |
| `JWT_EXPIRES_IN` | No | Token lifetime in seconds (default `604800`) |
| `PORT` | No | HTTP port (default `3000`) |
| `CORS_ORIGINS` | No | Comma-separated browser origins (Expo web defaults to `localhost:8081` and `localhost:19006`) |
| `CLOUDINARY_CLOUD_NAME` | For uploads | Cloudinary account |
| `CLOUDINARY_API_KEY` | For uploads | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | For uploads | Cloudinary API secret |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | For password reset | Brevo SMTP |
| `SELF_PING_URL` | No | Optional keep-alive ping every 14 minutes |
| `GEOFENCE_NOTIFY_DEDUPE_HOURS` | No | Dedup window for geofence notifications (clamped to 2–6, default 4) |

## API

Routes that need a role require `Authorization: Bearer <accessToken>`.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register/owner` | Public | Register an owner |
| `POST` | `/auth/register/user` | Public | Register a user |
| `POST` | `/auth/login` | Public | Log in |
| `POST` | `/auth/forgot-password` | Public | Email a reset OTP |
| `POST` | `/auth/reset-password` | Public | Reset password with the OTP |
| `GET` | `/auth/me` | Auth | Current user |
| `PATCH` | `/auth/change-password` | Auth | Change password |
| `GET` | `/users/me` | Auth | Profile (includes owner profile when applicable) |
| `PATCH` | `/users/me` | Auth | Update profile |
| `GET` | `/users/me/points` | User | Point total and per-venue balances |
| `POST` | `/venues` | Owner | Create a venue |
| `GET` | `/venues` | Public | List venues |
| `GET` | `/venues/mine` | Owner | List the caller’s venues |
| `GET` | `/venues/near` | Public | Venues near `lat` / `lng` |
| `PATCH` | `/venues/:id` | Owner | Update a venue |
| `DELETE` | `/venues/:id` | Owner | Delete a venue |
| `POST` | `/perks` | Owner | Create a perk |
| `GET` | `/perks/venue/:venueId` | Public | Perks for a venue |
| `GET` | `/perks/mine` | Owner | Caller’s perks |
| `PATCH` | `/perks/:id` | Owner | Update a perk |
| `DELETE` | `/perks/:id` | Owner | Delete a perk |
| `POST` | `/upload` | Auth | Upload one image or video to Cloudinary |
| `POST` | `/upload/multiple` | Auth | Upload up to 20 files |
| `POST` | `/submissions` | User | Submit one photo or video |
| `POST` | `/submissions/batch` | User | Submit several items |
| `GET` | `/submissions/mine` | Auth | Caller’s submissions |
| `GET` | `/submissions/venue/:venueId/approved-media` | Public | Approved gallery for a venue |
| `GET` | `/submissions/owner` | Owner | Submissions across the owner’s venues |
| `GET` | `/submissions/venue/:venueId` | Owner | Submissions for one venue |
| `PATCH` | `/submissions/:id/review` | Owner | Approve or reject; approval awards points |
| `POST` | `/redemptions` | User | Spend points and receive a promo code |
| `GET` | `/redemptions/mine` | Auth | Caller’s redemptions |
| `GET` | `/redemptions/owner` | Owner | Redemptions across the owner’s venues |
| `GET` | `/redemptions/venue/:venueId` | Owner | Redemptions for one venue |
| `PATCH` | `/redemptions/:id/used` | Owner | Mark a promo code as used |
| `POST` | `/notifications/geofence-check` | Auth | Check whether the user is inside a venue geofence |
| `POST` | `/notifications/test-push` | Auth | Send a test push to the caller |

Request and response shapes are documented in Swagger.
