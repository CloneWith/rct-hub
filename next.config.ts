import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const apiBase = (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080")
  .replace(/\/$/, "");
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");
const apiHost = (() => {
  try {
    return new URL(apiBase).hostname;
  } catch {
    return "localhost";
  }
})();

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],

  // 'standalone' lets `next build` emit a minimal `server.js` that bundles
  // every page + dependency. The Docker image then only needs ~80 MB on
  // disk instead of carrying node_modules and source files. See the
  // Dockerfile in this repo for the runtime wiring.
  output: "standalone",

  // Cache Components (PPR)：路由默认动态，未标记动态访问的部分自动提取静态 shell，
  // 数据缓存由 use cache / cacheLife / cacheTag 显式接管（替代 fetch next.revalidate）。
  cacheComponents: true,

  // Public client/runtime config exposed at /__public-env.json style — we
  // surface these via explicit env reads instead. The block below only
  // forwards them so the server can log them at boot for ops.
  env: {
    NEXT_PUBLIC_API_BASE: apiBase,
    NEXT_PUBLIC_SITE_URL: siteUrl,
  },

  // Allow <Image /> to serve osu! assets (avatars and beatmap covers).
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "a.ppy.sh",
      },
      {
        protocol: "https",
        hostname: "b.ppy.sh",
      },
      {
        protocol: "https",
        hostname: "c.ppy.sh",
      },
      {
        protocol: "https",
        hostname: "s.ppy.sh",
        pathname: "/mp/**",
      },
    ],
  },

  // Standalone output still expects a single hostname to be the canonical
  // site origin. We set it from env so that /robots, OG tags, redirects,
  // and Authlib (OAuth state cookies) all line up with the deployment URL.
  poweredByHeader: false,
  reactStrictMode: true,
};

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-frontmatter"],
  },
});

export default withMDX(nextConfig);
