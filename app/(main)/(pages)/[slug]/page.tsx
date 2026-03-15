import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Dynamic page route for top-level slugs (e.g. /about, /privacy).
 * Previously served Sanity CMS pages; now returns 404 until another content source is configured.
 */
export default async function Page({ params }: PageProps) {
  await params;
  notFound();
}
