import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Calendar, User } from "lucide-react";
import type { PostDetail as PostDetailType } from "@/app/lib/posts";

function formatDate(date: string): string {
  try {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return date;
  }
}

export function PostDetail({ post }: { post: PostDetailType }) {
  return (
    <div className="min-h-screen py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <Link
          href="/news"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to News
        </Link>

        {post.coverImage && (
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted mt-8">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>
        )}

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mt-8">
          {post.title}
        </h1>

        <div className="flex flex-wrap items-center gap-6 mt-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <User className="w-4 h-4" />
            {post.author}
          </span>
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {formatDate(post.publishedAt)}
          </span>
        </div>

        <article className="prose prose-invert max-w-none mt-8">
          <post.Content />
        </article>
      </div>
    </div>
  );
}
