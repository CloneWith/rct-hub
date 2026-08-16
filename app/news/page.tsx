import { getNewsFeed } from "@/app/lib/news";
import { NewsList } from "./NewsList";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "新闻与公告 — RCT S1",
  description: "来自 RCT Staff 的最新消息！",
};

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const items = await getNewsFeed();
  return <NewsList items={items} />;
}
