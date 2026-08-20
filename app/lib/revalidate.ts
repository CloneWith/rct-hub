"use server";

import { revalidateTag } from "next/cache";

/**
 * Invalidate the server-side announcements Data Cache.
 *
 * The homepage news feed and `/news` both read announcements through
 * `serverGraphQLRequest` with `tags: ["announcements"]`. Without this action,
 * an admin create/update/delete/publish would take up to 60s (the ISR window)
 * to become visible on the public pages.
 *
 * Call this from admin mutations (see `useCreateAnnouncement` & co. in
 * `hooks.ts`) after a successful write.
 *
 * The `"max"` profile gives stale-while-revalidate semantics: the stale entry
 * keeps being served while the fresh data is fetched in the background.
 */
export async function revalidateAnnouncements(): Promise<void> {
  revalidateTag("announcements", "max");
}
