/**
 * This route is responsible for the built-in authoring environment using Sanity Studio.
 * All routes under your studio path is handled by this file using Next.js' catch-all routes:
 * https://nextjs.org/docs/routing/dynamic-routes#catch-all-routes
 *
 * SECURITY: This page is restricted to ADMIN users only.
 * Access is enforced using requireAdmin() which checks for ADMIN role.
 *
 * You can learn more about the next-sanity package here:
 * https://github.com/sanity-io/next-sanity
 */

import { metadata, viewport } from "next-sanity/studio";
import { requireAdmin } from "@/lib/auth";
import Studio from "./Studio";

export { metadata, viewport };

export default async function StudioPage() {
  await requireAdmin();

  return <Studio />;
}
