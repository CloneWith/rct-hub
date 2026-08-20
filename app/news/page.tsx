import { cacheLife, cacheTag } from "next/cache";
import { getNewsFeed } from "@/app/lib/news";
import { NewsList } from "./NewsList";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "新闻与公告 — RCT S1",
  description: "来自 RCT Staff 的最新消息！",
};

// Cache Components 下段配置 export const revalidate 会被禁止，缓存语义改由
// use cache + cacheLife 接管：整页预渲染，公告变更通过 revalidateTag("announcements") 秒级失效。
export default async function NewsPage() {
  "use cache";
  cacheLife("minutes"); // 60s revalidate + 1h expire，与原 ISR 语义一致
  cacheTag("announcements");

  const items = await getNewsFeed();
  return <NewsList items={items} />;
}
