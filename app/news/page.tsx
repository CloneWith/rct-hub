import { getNewsFeed } from "@/app/lib/news";
import { NewsList } from "./NewsList";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "新闻与公告 — RCT S1",
  description: "来自 RCT Staff 的最新消息！",
};

// ISR：最多 60s 回源一次。删除 force-dynamic，否则会整体禁用 Data Cache，
// 使 fetch 层的 next: { revalidate: 60 } 失效，且与首页公告行为不一致。
export const revalidate = 60;

export default async function NewsPage() {
  const items = await getNewsFeed();
  return <NewsList items={items} />;
}
