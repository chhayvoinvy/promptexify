import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Dynamic help article route.
 * Previously served Sanity CMS help articles; now returns 404 until another content source is configured.
 */
export default async function HelpArticlePage({ params }: Props) {
  await params;
  notFound();
}
