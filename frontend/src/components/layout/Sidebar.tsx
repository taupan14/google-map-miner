import { Map, Cpu } from "lucide-react";
import NavItem from "./NavItem";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs/new", label: "New Job" },
  { href: "/history", label: "History" },
];

export default function Sidebar() {
  return (
    <aside className="w-56 min-h-screen bg-bg-surface border-r border-bg-border flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-bg-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <Map size={16} className="text-white" />
          </div>
          <div>
            <div className="text-text-primary font-semibold text-sm leading-tight">
              Map Miner
            </div>
            <div className="text-text-muted text-xs">Data Platform</div>
          </div>
        </div>
      </div>

      {/* Nav - hanya pass string, bukan component */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => (
          <NavItem key={item.href} href={item.href} label={item.label} />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-bg-border">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Cpu size={12} />
          <span>v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}
