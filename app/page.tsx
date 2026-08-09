"use client";

import Link from "next/link";
import { Button, Card, Skeleton } from "@heroui/react";
import {
  Gamepad2,
  Users,
  Swords,
  Grid3X3,
  Shield,
  Megaphone,
  LogIn,
  ArrowRight,
  Trophy,
  Timer,
} from "lucide-react";
import { getOsuLoginUrl } from "@/app/lib/api";
import { useAuth } from "@/app/context/AuthContext";
import { useAnnouncements } from "@/app/lib/hooks";
import ShapeGrid from "@/app/components/ShapeGrid";

export default function Home() {
  const {user} = useAuth();
  const {data: announcements = [], isLoading: announcementsLoading} =
    useAnnouncements(true);

  return (
    <div className="min-h-screen">
      {/* ======== Hero ======== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-background to-accent/20"/>
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent"/>
        <div className="absolute inset-0">
          <ShapeGrid
            speed={0.5}
            squareSize={40}
            direction="diagonal"
            borderColor="#e95f7e"
            hoverFillColor="#222"
            shape="square"
            hoverTrailAmount={0}
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:py-40 bg-transparent">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              <span className="font-mono bg-linear-to-r from-primary to-pink-500 bg-clip-text text-transparent">
                RCT Hub
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl max-w-2xl">
              The premier web platform for the osu! RCT tournament format —
              manage rooms, build mappools, run the 4&times;4 board game, all
              with role-based access control and real-time match state.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              {!user && (
                <a href={getOsuLoginUrl()}>
                  <Button variant="primary" size="lg" className="gap-2 text-base">
                    <LogIn className="w-5 h-5"/>
                    Login with osu!
                  </Button>
                </a>
              )}
              <Link href="/rooms">
                <Button variant="outline" size="lg" className="gap-2 text-base">
                  Browse Rooms
                  <ArrowRight className="w-4 h-4"/>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ======== Features ======== */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to run RCT tournaments
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              From room setup to match completion, RCT Hub provides a complete
              toolchain for the RCT format.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-6 border border-border bg-muted/30 hover:border-primary/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <Users className="w-5 h-5 text-primary"/>
              </div>
              <h3 className="font-semibold text-lg mb-2">Room Setup</h3>
              <p className="text-sm text-muted-foreground">
                Create rooms, assign strategists, set BP order, rosters, and
                stream links — all through a guided setup flow.
              </p>
            </Card>

            <Card className="p-6 border border-border bg-muted/30 hover:border-primary/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
                <Swords className="w-5 h-5 text-green-400"/>
              </div>
              <h3 className="font-semibold text-lg mb-2">Match Engine</h3>
              <p className="text-sm text-muted-foreground">
                Pure, deterministic match rules engine. Ban, pick, claim, rob,
                surrender — every move is validated and version-controlled.
              </p>
            </Card>

            <Card className="p-6 border border-border bg-muted/30 hover:border-primary/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                <Grid3X3 className="w-5 h-5 text-purple-400"/>
              </div>
              <h3 className="font-semibold text-lg mb-2">Mappool &amp; Board</h3>
              <p className="text-sm text-muted-foreground">
                4&times;4 board with HD, DT, HR, NM zones. 7 piece mods
                including FM, Shiro, and TB. Full move history and replay.
              </p>
            </Card>

            <Card className="p-6 border border-border bg-muted/30 hover:border-primary/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center mb-4">
                <Shield className="w-5 h-5 text-amber-400"/>
              </div>
              <h3 className="font-semibold text-lg mb-2">Role System</h3>
              <p className="text-sm text-muted-foreground">
                Player, Strategist, Referee, Streamer, Admin — global and
                room-scoped roles give precise access control.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* ======== How It Works ======== */}
      <section className="py-24 sm:py-32 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How RCT Hub Works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              A typical tournament match flow from setup to finish.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Create Room & Setup",
                desc: "Create a room, assign strategists, set the BP order, add players, and connect your osu! multiplayer link.",
                icon: Users,
              },
              {
                step: "2",
                title: "Run the Match",
                desc: "Start the match — the engine handles ban/pick phases, board placement, robbery, and win conditions.",
                icon: Swords,
              },
              {
                step: "3",
                title: "View Results",
                desc: "Winner, scores, won-piece counts, and alignment info are recorded. Full move history for replay.",
                icon: Trophy,
              },
            ].map(({step, title, desc, icon: Icon}) => (
              <div key={step} className="text-center p-6">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-primary"/>
                </div>
                <div className="text-xs font-bold text-primary mb-1">
                  STEP {step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======== Quick Stats ======== */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                icon: Users,
                label: "Player Roles",
                value: "5",
                desc: "Player, Strategist, Referee, Streamer, Admin",
              },
              {
                icon: Grid3X3,
                label: "Board Zones",
                value: "4×4",
                desc: "HD, DT, HR, NM — 16 mod slots on the board",
              },
              {
                icon: Timer,
                label: "Move Types",
                value: "11",
                desc: "Pick, Ban, Claim, Rob, Win, Dead, Surrender & more",
              },
            ].map(({icon: Icon, label, value, desc}) => (
              <div
                key={label}
                className="text-center p-8 rounded-xl border border-border"
              >
                <Icon className="w-8 h-8 text-primary mx-auto mb-4"/>
                <div className="text-3xl font-bold mb-2">{value}</div>
                <div className="font-medium mb-1">{label}</div>
                <div className="text-sm text-muted-foreground">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======== Announcements ======== */}
      <section className="py-24 sm:py-32 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Latest News
              </h2>
              <p className="mt-2 text-muted-foreground">
                Updates and announcements from the RCT Hub team.
              </p>
            </div>
            <Link href="/news">
              <Button variant="ghost" className="gap-2">
                View all
                <ArrowRight className="w-4 h-4"/>
              </Button>
            </Link>
          </div>

          {announcementsLoading ? (
            <div className="grid gap-6 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 rounded-xl"/>
              ))}
            </div>
          ) : announcements.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-3">
              {announcements.filter(a => a.visible)
                .map((a) => (
                  <Card
                    key={a.id}
                    className="p-6 border border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start gap-2 mb-3">
                      {a.pinned && (
                        <Megaphone className="w-4 h-4 text-primary shrink-0 mt-0.5"/>
                      )}
                      <div>
                        <h3 className="font-semibold">{a.title}</h3>
                        {a.author && (
                          <p className="text-xs text-muted-foreground mt-1">
                            by {a.author.username}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {a.content?.replace(/<[^>]*>/g, "").slice(0, 200)}
                    </p>
                  </Card>
                ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-30"/>
              <p className="text-lg">No announcements yet</p>
              <p className="text-sm">Check back later for updates.</p>
            </div>
          )}
        </div>
      </section>

      {/* ======== CTA ======== */}
      {!user && (
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to host your own RCT tournament?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Login with your osu! account and start creating rooms — no
              separate registration needed.
            </p>
            <div className="mt-8">
              <a href={getOsuLoginUrl()}>
                <Button variant="primary" size="lg" className="gap-2 text-base">
                  <Gamepad2 className="w-5 h-5"/>
                  Get Started with osu!
                </Button>
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ======== Footer ======== */}
      <footer className="border-t border-border py-8">
        <div
          className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4"/>
            <span>RCT Hub &mdash; osu! Tournament Platform</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Backend: Go + Gin + MongoDB + Redis</span>
            <span>API: REST + GraphQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
