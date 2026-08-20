import { cacheLife, cacheTag } from "next/cache";
import { AnnouncementsDocument } from "@/app/lib/operations";
import { serverGraphQLRequest, type GraphQLResponse } from "@/app/lib/api";
import type { AnnouncementsQuery } from "@/app/graphql/graphql";
import { getAllPosts, type Post } from "@/app/lib/posts";

type AnnouncementItem = AnnouncementsQuery["announcements"]["items"][number];

export type NewsItem =
  | {
      kind: "post";
      slug: string;
      title: string;
      publishedAt: string;
      author: string;
      summary: string;
      href: string;
      coverImage?: string;
    }
  | {
      kind: "announcement";
      id: string;
      title: string;
      publishedAt: string;
      author: string;
      summary: string;
      href: string;
      coverImage?: undefined;
      pinned: boolean;
    };

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchAnnouncements(): Promise<AnnouncementItem[]> {
  "use cache";
  cacheLife("minutes"); // 60s revalidate + 1h expire
  cacheTag("announcements"); // admin 变更后由 revalidateTag("announcements") 秒级失效
  try {
    const res: GraphQLResponse<AnnouncementsQuery> =
      await serverGraphQLRequest(AnnouncementsDocument, {
        page: 1,
        perPage: 50,
      });

    if (res.errors?.length) {
      console.error("Failed to fetch announcements:", res.errors[0].message);
    }

    return res.data?.announcements.items ?? [];
  } catch (err) {
    console.error("Failed to fetch announcements:", err);
    return [];
  }
}

function postToNewsItem(post: Post): NewsItem {
  return {
    kind: "post",
    slug: post.slug,
    title: post.title,
    publishedAt: post.publishedAt,
    author: post.author,
    summary: post.summary,
    href: `/news/${post.slug}`,
    coverImage: post.coverImage,
  };
}

function announcementToNewsItem(a: AnnouncementItem): NewsItem {
  return {
    kind: "announcement",
    id: a.id,
    title: a.title,
    publishedAt: a.publishedAt ?? a.createdAt,
    author: a.author?.username ?? "RCT Team",
    summary: stripHtml(a.content).slice(0, 200),
    href: `#announcement-${a.id}`,
    pinned: a.pinned,
  };
}

export async function getNewsFeed(): Promise<NewsItem[]> {
  const sortByPublishTime: (a: NewsItem, b: NewsItem) => number = (a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();

  const [posts, announcements] = await Promise.all([
    getAllPosts(),
    fetchAnnouncements(),
  ]);

  const postItems = posts.map(postToNewsItem);

  const pinnedAnnouncements = announcements
    .filter(a => a.pinned)
    .map(announcementToNewsItem)
    .sort(sortByPublishTime);

  const otherAnnouncements = announcements
    .filter(a => !a.pinned)
    .map(announcementToNewsItem);

  return [...pinnedAnnouncements, ...[...postItems, ...otherAnnouncements].sort(sortByPublishTime)];
}
