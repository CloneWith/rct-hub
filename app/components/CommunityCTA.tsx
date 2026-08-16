import Reveal from "@/app/components/Reveal";
import { ArrowRight, Users } from "lucide-react";
import { Button } from "@heroui/react";

export default function CommunityCTA() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <div
            className="flex flex-col lg:flex-row items-center justify-between gap-8 rounded-2xl border border-border bg-background p-8 sm:p-12">
            <div className="flex-1">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary"/>
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3">
                加入我们的社群以获得最新消息！
              </h2>
              <p className="text-muted-foreground max-w-xl">
                与其他玩家、策略师与裁判自由交流。了解比赛最新进展，获悉通知，反馈意见。
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Button variant="primary" size="lg" className="gap-2">
                加入社区
                <ArrowRight className="w-4 h-4"/>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
