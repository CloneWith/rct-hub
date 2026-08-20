import { FileQuestion } from "lucide-react";
import { Link } from "@heroui/react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <FileQuestion className="mx-auto mb-6 flex h-14 w-14 items-center justify-center text-primary text-3xl"/>
        <p className="font-mono text-5xl font-bold text-gradient-ember">404</p>
        <h1 className="mt-4 font-serif-cjk text-2xl font-bold">这一页不存在</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          链接可能已失效，或者你在棋盘上走出了一步不存在的棋。
        </p>
        <Link href="/" className="mt-8 inline-flex">
          回到首页
          <Link.Icon/>
        </Link>
      </div>
    </div>
  );
}
