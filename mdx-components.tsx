import type { MDXComponents } from "mdx/types";
import Image, { type ImageProps } from "next/image";

const components: MDXComponents = {
  img: (props) => {
    const { src, alt, width, height, ...rest } = props as ImageProps & {
      src?: string;
    };
    if (!src) return null;
    return (
      <Image
        src={src}
        alt={alt || ""}
        width={width ? Number(width) : 800}
        height={height ? Number(height) : 400}
        className="rounded-lg"
        {...rest}
      />
    );
  },
};

export function useMDXComponents(): MDXComponents {
  return components;
}
