import { client } from "@/lib/sanity";
import { PortableText } from "@portabletext/react";
import { notFound } from "next/navigation";

interface PageProps {
  params: {
    slug: string;
  };
}

async function getPage(slug: string) {
  const query = `*[_type == "page" && slug.current == $slug][0]`;
  const page = await client.fetch(query, { slug });
  return page;
}

export default async function Page({ params }: PageProps) {
  const page = await getPage((await params).slug);

  if (!page) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold">{page.title}</h1>
      <div className="mt-8">
        <PortableText value={page.content} />
      </div>
    </div>
  );
}
