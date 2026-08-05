"use client";

import { PortalShell } from "@/components/portal/PortalShell";
import type { PortalNavGroup } from "@/components/portal/types";
import type { ReactNode } from "react";

const ownerNavGroups: PortalNavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", exact: true, icon: "dashboard" },
      { href: "/admin/analytics", label: "Analytics", icon: "analytics" },
      { href: "/admin/results", label: "Results", icon: "results" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/parts", label: "Parts", icon: "parts" },
      { href: "/admin/papers", label: "Papers", icon: "papers" },
      { href: "/admin/categories", label: "Categories", icon: "categories" },
      { href: "/admin/subcategories", label: "Sub Categories", icon: "subcategories" },
      { href: "/admin/questions", label: "Practice Questions", icon: "questions" },
      { href: "/admin/questions/import", label: "Import Excel", icon: "plus" },
      { href: "/admin/questions/import/history", label: "Import History", icon: "reports" },
      { href: "/admin/mock-exams", label: "Mock Exams", icon: "mock" },
    ],
  },
  {
    label: "Billing",
    items: [
      { href: "/admin/billing/plans", label: "Plans", icon: "plans" },
      { href: "/admin/billing/products", label: "Products", icon: "products" },
      { href: "/admin/billing/purchases", label: "Purchases", icon: "purchases" },
      { href: "/admin/billing/subscriptions", label: "Subscriptions", icon: "subscriptions" },
    ],
  },
  {
    label: "Users",
    items: [
      { href: "/admin/students", label: "Students", icon: "students" },
      { href: "/admin/partners", label: "Partners", icon: "partners" },
      { href: "/admin/content-admins", label: "Content Admins", icon: "students" },
      { href: "/admin/settings", label: "Settings", icon: "settings" },
    ],
  },
];

const contentAdminNavGroups: PortalNavGroup[] = [
  {
    label: "Questions",
    items: [
      { href: "/admin/questions", label: "Practice Questions", icon: "questions" },
      { href: "/admin/questions/import", label: "Import Excel", icon: "plus" },
      { href: "/admin/questions/import/history", label: "Import History", icon: "reports" },
      { href: "/admin/mock-exams", label: "Mock Exam Questions", icon: "mock" },
    ],
  },
];

interface AdminShellProps {
  userName: string;
  role: "OWNER" | "CONTENT_ADMIN";
  children: ReactNode;
}

export function AdminShell({ userName, role, children }: AdminShellProps) {
  const isContent = role === "CONTENT_ADMIN";

  return (
    <PortalShell
      accent="admin"
      homeHref={isContent ? "/admin/questions" : "/admin"}
      portalLabel={isContent ? "Content Admin" : "Owner Portal"}
      userRoleLabel={isContent ? "Content Admin" : "Owner"}
      headerLabel={isContent ? "Question Management" : "Owner Portal"}
      navGroups={isContent ? contentAdminNavGroups : ownerNavGroups}
      userName={userName}
    >
      {children}
    </PortalShell>
  );
}
