# Gemini Project Analysis: promptexify

This document summarizes the key architectural and technical aspects of the `promptexify` project.

## Project Overview

`promptexify` is a full-stack web application built with Next.js. It features a comprehensive user authentication system, content management capabilities, a subscription model with payments, and a detailed admin dashboard. The application is designed to be flexible, particularly in its storage options.

## Core Technologies

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL, managed with Prisma ORM.
- **Authentication:** Supabase (handles magic links, OAuth with Google, and password-based auth).
- **Payments:** Stripe for handling premium subscriptions.
- **Content Management:** Sanity.io is used for structured content.
- **Storage:** The application is configured to use either **AWS S3** or **DigitalOcean Spaces** for file/media storage.
- **UI/Styling:**
  - Tailwind CSS for styling.
  - Radix UI primitives, likely integrated via `shadcn/ui`.
  - `lucide-react` for icons.
- **Deployment:** Likely Vercel, inferred from the use of `@vercel/analytics`.

## Project Structure

The project follows a standard Next.js App Router structure with some key directories:

- `app/`: Contains all routes, pages, and layouts. It's divided into route groups like `(auth)`, `(main)`, `(protected)`, and `api`.
- `actions/`: Holds server-side logic (Next.js Server Actions) for various features like auth, posts, settings, etc.
- `components/`: Contains reusable React components, including UI primitives (`ui/`) and dashboard-specific components (`dashboard/`).
- `lib/`: Core logic, utilities, and client libraries. This is a critical directory.
  - `lib/auth.ts`: Centralized authentication logic, integrating Supabase and Prisma.
  - `lib/prisma.ts`: Prisma client instance.
  - `lib/storage.ts`: Abstraction layer for handling both AWS S3 and DigitalOcean Spaces.
  - `lib/stripe.ts`: Stripe client and subscription logic.
  - `lib/sanity.ts`: Sanity client and query helpers.
  - `lib/schemas.ts`: Zod schemas for data validation.
- `prisma/`: Contains the `schema.prisma` file defining the database schema and migrations.
- `sanity/`: Configuration and schema definitions for the Sanity Studio.

## Key Architectural Patterns

### Authentication Flow

1.  Authentication is initiated from the client-side but handled by server actions in `lib/auth.ts`.
2.  Supabase is the primary auth provider.
3.  After a successful Supabase authentication, the `upsertUserInDatabase` function is called to create or update a corresponding user record in the PostgreSQL database via Prisma.
4.  The application uses role-based access control (RBAC) with functions like `requireAuth()`, `requireAdmin()`, and `requirePremiumAccess()` to protect routes and actions.

### Storage Abstraction

The application provides a flexible storage solution, allowing the user to choose between AWS S3 and DigitalOcean Spaces.

- The core logic is in `lib/storage.ts`.
- The choice of provider and its configuration (credentials, bucket/space name) are managed through environment variables and likely configurable through the admin dashboard (`components/dashboard/settings-form.tsx`).
- The `next.config.ts` file is configured to allow images from AWS (`*.s3.amazonaws.com`), indicating S3 is a primary or default option.

## Development Scripts

Key scripts from `package.json`:

- `npm run dev`: Starts the Next.js development server.
- `npm run build`: Builds the application for production.
- `npm run lint`: Runs the ESLint linter.
- `npm run db:migrate`: Deploys database migrations.
- `npm run db:studio`: Opens the Prisma Studio to view and edit data.
- `npm run db:push`: Pushes the Prisma schema to the database (for development).
