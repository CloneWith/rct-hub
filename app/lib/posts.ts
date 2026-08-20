import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { ComponentType } from "react";

const POSTS_DIR = path.join(process.cwd(), "content/posts");

// Fallback 用于 MDX frontmatter 缺失 publishedAt 时。必须是常量——Cache Components
// 预渲染阶段禁止同步 IO（new Date() 等非确定性调用会直接导致构建失败）。
const FALLBACK_PUBLISHED_AT = "1970-01-01T00:00:00Z";

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
        publishedAt: (data.publishedAt as string) ?? FALLBACK_PUBLISHED_AT,
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
    publishedAt: (data.publishedAt as string) ?? FALLBACK_PUBLISHED_AT,
    coverImage: data.coverImage as string | undefined,
    summary: toSummary(content, data.summary as string | undefined),
    Content: mod.default,
  };
}
