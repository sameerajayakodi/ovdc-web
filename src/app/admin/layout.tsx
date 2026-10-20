import type { Metadata } from "next";
import { AdminRoot } from "@/components/admin/AdminRoot";
import "./admin.css";

export const metadata: Metadata = {
  title: { default: "OVDC Admin", template: "%s · OVDC Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminRoot>{children}</AdminRoot>;
}
