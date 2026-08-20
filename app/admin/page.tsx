"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Tabs, Spinner } from "@heroui/react";
import {
  ArrowLeft,
  Megaphone,
  Music,
  Shield,
  ShieldQuestion,
  Users,
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import UsersPanel from "./components/UsersPanel";
import BeatmapsPanel from "./components/BeatmapsPanel";
import AnnouncementsPanel from "./components/AnnouncementsPanel";

export default function AdminPage() {
  const router = useRouter();
  const {user, loading} = useAuth();
  const isAdmin = user?.roles.includes("ADMIN") ?? false;
  const [activeTab, setActiveTab] = useState("users");

  // ---- Loading / access denied ----
  // Only show the spinner while the auth query is in-flight. Once it
  // resolves, a null user (not logged in) should fall through to the
  // !isAdmin branch and show the same "access denied" UI as a non-admin.
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg"/>
      </div>
    );

  if (!isAdmin)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <ShieldQuestion className="w-16 h-16 text-muted-foreground/30"/>
        <h1 className="text-2xl font-bold">...不熟</h1>
        <p className="text-muted-foreground">
          需要管理员权限才能访问。
        </p>
        <Button
          variant="secondary"
          onPress={() => router.push("/")}
        >
          <ArrowLeft className="w-4 h-4"/>
          返回主页
        </Button>
      </div>
    );

  // ---- Admin view ----
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Shield className="w-8 h-8 text-primary"/>
        <div>
          <h1 className="text-2xl font-bold">管理后台</h1>
          <p className="text-sm text-muted-foreground">
            管理房间、用户、图池与公告。
          </p>
        </div>
      </div>

      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(k) => setActiveTab(k as string)}
        className="mb-8"
      >
        <Tabs.ListContainer>
          <Tabs.List>
            <Tabs.Tab id="users">
              <Users className="w-4 h-4 inline mr-1.5"/>
              用户
              <Tabs.Indicator/>
            </Tabs.Tab>
            <Tabs.Tab id="beatmaps">
              <Music className="w-4 h-4 inline mr-1.5"/>
              谱面
              <Tabs.Indicator/>
            </Tabs.Tab>
            <Tabs.Tab id="announcements">
              <Megaphone className="w-4 h-4 inline mr-1.5"/>
              公告
              <Tabs.Indicator/>
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id="users">
          <UsersPanel enabled={activeTab === "users"}/>
        </Tabs.Panel>
        <Tabs.Panel id="beatmaps">
          <BeatmapsPanel enabled={activeTab === "beatmaps"}/>
        </Tabs.Panel>
        <Tabs.Panel id="announcements">
          <AnnouncementsPanel enabled={activeTab === "announcements"}/>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
