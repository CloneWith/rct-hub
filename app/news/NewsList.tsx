"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, Chip } from "@heroui/react";
import { Megaphone, FileText, Pin } from "lucide-react";
import type { NewsItem } from "@/app/lib/news";
import { PageHero } from "@/app/components/Section";
import Reveal from "@/app/components/Reveal";
import CommunityCTA from "@/app/components/CommunityCTA";

function formatDate(date: string): string {
  try {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return date;
  }
}

function NewsCard({item}: { item: NewsItem }) {
  const wrapperClasses =
    "group flex flex-col overflow-hidden border border-border hover:border-primary/30 transition-colors";

  const cardBody = (
    <>
      {item.coverImage && (
        <div className="rounded-xl relative aspect-video w-full overflow-hidden bg-muted">
          <Image
            src={item.coverImage}
            alt={item.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}
      <div className="flex flex-col p-6">
        <div className="mb-3 flex items-center gap-2">
          <Chip size="lg" variant="soft" color={item.kind === "post" ? "accent" : "warning"}>
            <span className="flex items-center gap-1">
              {item.kind === "post" ? (
                <FileText className="w-4 h-4"/>
              ) : (
                <Megaphone className="w-4 h-4"/>
              )}
              {item.kind === "post" ? "Post" : "Announcement"}
            </span>
          </Chip>
          {item.kind === "announcement" && item.pinned && (
            <Chip size="lg" variant="soft" color="danger">
              <Pin className="w-4 h-4"/>
            </Chip>
          )}
        </div>
        <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
          {item.title}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          作者 {item.author} · {formatDate(item.publishedAt)}
        </p>
        <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
          {item.summary}
        </p>
      </div>
    </>
  );

  if (item.kind === "post") {
    return (
      <Link href={item.href} className="block">
        <Card className={wrapperClasses}>{cardBody}</Card>
      </Link>
    );
  }

  return (
    <Card id={`announcement-${item.id}`} className={wrapperClasses}>
      {cardBody}
    </Card>
  );
}

export function NewsList({items}: { items: NewsItem[] }) {
  return (
    <div className="min-h-screen">
      <PageHero
        eyebrow="News"
        title="新闻与公告"
        lead="来自 RCT Staff 的最新消息！"
      />

      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          {items.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item, i) => (
                <Reveal key={i} delay={i * 70}>
                  <NewsCard
                    key={item.kind === "post" ? item.slug : item.id}
                    item={item}
                  />
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal>
              <div className="text-center py-12 text-muted-foreground">
                <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-30"/>
                <p className="text-lg">还没有公告</p>
                <p className="text-sm">过段时间再来看看吧</p>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* Community CTA */}
      <CommunityCTA />
    </div>
  );
}
