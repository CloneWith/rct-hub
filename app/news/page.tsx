import { getNewsFeed } from "@/app/lib/news";
import { NewsList } from "./NewsList";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "News — RCT Hub",
  description: "Latest announcements and posts from RCT Hub.",
};

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const items = await getNewsFeed();
  return <NewsList items={items} />;
}
