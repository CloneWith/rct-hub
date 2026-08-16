import { getPostBySlug, getPostSlugs } from "@/app/lib/posts";
import { PostDetail } from "./PostDetail";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CommunityCTA from "@/app/components/CommunityCTA";

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return getPostSlugs().map((slug) => ({slug}));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const {slug} = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {};
  }

  return {
    title: `${post.title} — RCT Hub News`,
    description: post.summary,
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const {slug} = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      <PostDetail post={post}/>
      <CommunityCTA/>
    </>
  );
}
