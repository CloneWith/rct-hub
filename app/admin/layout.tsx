import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard — RCT Hub",
  description: "RCT Hub admin dashboard for managing users, beatmaps, and announcements.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
