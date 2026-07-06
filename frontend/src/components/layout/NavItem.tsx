"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Plus, History, LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/jobs/new": Plus,
  "/history": History,
};

interface NavItemProps {
  href: string;
  label: string;
}

export default function NavItem({ href, label }: NavItemProps) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  const Icon = ICON_MAP[href];

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
        isActive
          ? "bg-accent/15 text-accent border border-accent/20"
          : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated",
      )}
    >
      {Icon && <Icon size={16} />}
      {label}
    </Link>
  );
}
