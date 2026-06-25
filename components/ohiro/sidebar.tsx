"use client";

import { cn } from "@/lib/utils";
import { ActiveView } from "@/lib/types";
import {
  LayoutDashboard,
  BookOpen,
  TrendingDown,
  TrendingUp,
  CreditCard,
  LineChart,
  BarChart3,
  Settings,
  Shield,
  Menu,
  X,
  BrainCircuit,
  Medal,
} from "lucide-react";
import { useState } from "react";

const navItems: { id: ActiveView; label: string; icon: React.ElementType; shortLabel: string }[] = [
  { id: "dashboard", label: "Dashboard", shortLabel: "DASH", icon: LayoutDashboard },
  { id: "ledger", label: "Ledger", shortLabel: "LGDR", icon: BookOpen },
  { id: "gastos", label: "Gastos", shortLabel: "GAST", icon: TrendingDown },
  { id: "receitas", label: "Receitas", shortLabel: "RECV", icon: TrendingUp },
  { id: "dividas", label: "Dívidas", shortLabel: "DVDA", icon: CreditCard },
  { id: "investimentos", label: "Investimentos", shortLabel: "INVS", icon: LineChart },
  { id: "projecoes", label: "Projeções", shortLabel: "PROJ", icon: BarChart3 },
  { id: "tempo-servico", label: "Tempo de Serviço", shortLabel: "TSVC", icon: Medal },
  { id: "ia", label: "IA Financeira", shortLabel: "IA", icon: BrainCircuit },
  { id: "configuracoes", label: "Configurações", shortLabel: "CONF", icon: Settings },
];

interface SidebarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
}

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile toggle button */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-md bg-card border border-border/40 text-foreground"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Menu"
      >
        {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full z-50 flex flex-col border-r border-border/40 bg-sidebar backdrop-blur-md transition-all duration-300",
          collapsed ? "w-16" : "w-56",
          "hidden md:flex",
          mobileOpen && "flex w-56"
        )}
      >
        {/* Logo */}
        <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-border/40", collapsed && "justify-center px-0")}>
          <div className="flex items-center justify-center size-8 rounded-md bg-[hsl(var(--accent))/20] border border-[hsl(var(--accent))/30]">
            <Shield className="size-4 text-[hsl(var(--accent))]" />
          </div>
          {!collapsed && (
            <div>
              <div className="text-sm font-bold text-foreground tracking-tight leading-none">OHIRO</div>
              <div className="text-[10px] font-mono text-muted-foreground tracking-widest">LEDGER</div>
            </div>
          )}
        </div>

        {/* Nav label */}
        {!collapsed && (
          <div className="px-4 pt-4 pb-1">
            <span className="text-[10px] font-mono text-muted-foreground/50 tracking-widest uppercase">Módulos</span>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 px-2 py-2 flex flex-col gap-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileOpen(false);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150 w-full text-left group",
                  collapsed && "justify-center px-0",
                  item.id === "ia" && !isActive && "text-primary/70 hover:text-primary hover:bg-primary/10 border border-transparent",
                  item.id === "ia" && isActive && "bg-primary/15 text-primary border border-primary/30",
                  item.id !== "ia" && isActive && "bg-[hsl(var(--accent))/15] text-[hsl(var(--accent))] border border-[hsl(var(--accent))/25]",
                  item.id !== "ia" && !isActive && "text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed && (
                  <span className="font-mono text-xs tracking-wide">{item.label}</span>
                )}
                {collapsed && (
                  <span className="sr-only">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-border/40 px-2 py-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all w-full",
              collapsed && "justify-center px-0"
            )}
          >
            <Menu className="size-4 shrink-0" />
            {!collapsed && <span>Recolher</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
