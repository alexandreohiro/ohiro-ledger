"use client";

import { cn } from "@/lib/utils";
import { ActiveView } from "@/lib/types";
import { LayoutDashboard, BookOpen, BrainCircuit, CreditCard, Settings } from "lucide-react";

const items: { id: ActiveView; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard },
  { id: "ledger", label: "Ledger", icon: BookOpen },
  { id: "ia", label: "AI", icon: BrainCircuit },
  { id: "dividas", label: "Debts", icon: CreditCard },
  { id: "configuracoes", label: "Settings", icon: Settings },
];

interface BottomNavProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
}

/** Navegação inferior fixa para mobile — torna o uso diário tipo "app" em vez de depender do menu hambúrguer. */
export function BottomNav({ activeView, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex md:hidden items-stretch border-t border-border/40 bg-sidebar/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-mono tracking-wide transition-colors",
              item.id === "ia" && isActive && "text-primary",
              item.id === "ia" && !isActive && "text-primary/70",
              item.id !== "ia" && isActive && "text-[hsl(var(--accent))]",
              item.id !== "ia" && !isActive && "text-muted-foreground"
            )}
            aria-label={item.label}
          >
            <Icon className="size-5" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
