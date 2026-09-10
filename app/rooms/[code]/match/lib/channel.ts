"use client";

/**
 * IRC channel derivation — mirrors `internal/irc/channel.go`:
 * the only channel that may control a room is `#mp_<id>` where `<id>` is the
 * numeric room id embedded in the official osu! multiplayer URL. The frontend
 * needs this to query `ircObservations(matchId, channel)`.
 */

export function channelFromMPLink(link: string | null | undefined): string | null {
  if (!link) return null;
  const trimmed = link.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname.toLowerCase() !== "osu.ppy.sh" ||
    parsed.port !== "" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    return null;
  }
  const parts = parsed.pathname.replace(/^\/+/, "").split("/");
  if (parts.length !== 3 || parts[0] !== "community" || parts[1] !== "matches") {
    return null;
  }
  const id = parts[2];
  if (!/^[1-9]\d*$/.test(id)) return null;
  return `#mp_${id}`;
}
