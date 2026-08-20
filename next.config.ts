import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  // Cache Components (PPR)：路由默认动态，未标记动态访问的部分自动提取静态 shell，
  // 数据缓存由 use cache / cacheLife / cacheTag 显式接管（替代 fetch next.revalidate）。
  cacheComponents: true,
};

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-frontmatter"],
  },
});

export default withMDX(nextConfig);
