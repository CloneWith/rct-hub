"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, Chip, Button } from "@heroui/react";
import { Megaphone, FileText, ArrowRight, Users, Pin } from "lucide-react";
import type { NewsItem } from "@/app/lib/news";

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

function NewsCard({ item }: { item: NewsItem }) {
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
                <FileText className="w-4 h-4" />
              ) : (
                <Megaphone className="w-4 h-4" />
              )}
              {item.kind === "post" ? "Post" : "Announcement"}
            </span>
          </Chip>
          {item.kind === "announcement" && item.pinned && (
            <Chip size="lg" variant="soft" color="danger">
              <Pin className="w-4 h-4" />
            </Chip>
          )}
        </div>
        <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
          {item.title}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          by {item.author} · {formatDate(item.publishedAt)}
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

export function NewsList({ items }: { items: NewsItem[] }) {
  return (
    <div className="min-h-screen">
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              News
            </h1>
            <p className="mt-2 text-muted-foreground">
              Announcements and updates from the RCT Hub team.
            </p>
          </div>

          {items.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <NewsCard
                  key={item.kind === "post" ? item.slug : item.id}
                  item={item}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No news yet</p>
              <p className="text-sm">Check back later for updates.</p>
            </div>
          )}
        </div>
      </section>

      {/* Community CTA */}
      <section className="py-24 sm:py-32 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 rounded-2xl border border-border bg-background p-8 sm:p-12">
            <div className="flex-1">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3">
                加入我们的社群以获得最新消息！
              </h2>
              <p className="text-muted-foreground max-w-xl">
                Connect with other RCT players, strategists, and referees. Get
                early access to updates, tournament announcements, and community
                events.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Button variant="primary" size="lg" className="gap-2">
                Join Community
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
