"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function Header({ title, description, actions }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div>
        <h1 className="text-base font-semibold text-slate-900">{title}</h1>
        {description && (
          <p className="text-xs text-slate-500">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
      </div>
    </header>
  );
}
