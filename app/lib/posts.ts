import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { ComponentType } from "react";

const POSTS_DIR = path.join(process.cwd(), "content/posts");

export interface PostFrontmatter {
  slug: string;
  title: string;
  author: string;
  publishedAt: string;
  coverImage?: string;
  summary?: string;
}

export interface Post extends PostFrontmatter {
  summary: string;
}

export interface PostDetail extends Post {
  Content: ComponentType<Record<string, never>>;
}

function toSummary(content: string, summary?: string): string {
  if (summary) return summary;
  const plain = content
    .replace(/<[^>]+>/g, "")
    .replace(/[#*_`>[\]!|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.slice(0, 160) + (plain.length > 160 ? "…" : "");
}

export function getPostSlugs(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

export function getAllPosts(): Post[] {
  return getPostSlugs()
    .map((slug) => {
      const filePath = path.join(POSTS_DIR, `${slug}.mdx`);
      const fileContent = fs.readFileSync(filePath, "utf8");
      const { data, content } = matter(fileContent);
      return {
        slug,
        title: (data.title as string) ?? slug,
        author: (data.author as string) ?? "RCT Team",
        publishedAt: (data.publishedAt as string) ?? new Date().toISOString(),
        coverImage: data.coverImage as string | undefined,
        summary: toSummary(content, data.summary as string | undefined),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
}

export async function getPostBySlug(slug: string): Promise<PostDetail | null> {
  const filePath = path.join(POSTS_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const fileContent = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContent);

  const mod = (await import(
    `@/content/posts/${slug}.mdx`
  )) as unknown as {
    default: ComponentType<Record<string, never>>;
  };

  return {
    slug,
    title: (data.title as string) ?? slug,
    author: (data.author as string) ?? "RCT Team",
    publishedAt: (data.publishedAt as string) ?? new Date().toISOString(),
    coverImage: data.coverImage as string | undefined,
    summary: toSummary(content, data.summary as string | undefined),
    Content: mod.default,
  };
}
