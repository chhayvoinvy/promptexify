"use client";

import { LogoSymbol } from "@/components/ui/logo";
import { type NavbarProps } from "sanity";

export function StudioNavbar(props: NavbarProps) {
  return (
    <div
      style={{
        background: "var(--card-bg-color)",
        borderBottom: `1px solid var(--card-border-color)`,
        padding: "12px",
      }}
    >
      <div className="flex items-center justify-between">
        <LogoSymbol href="/dashboard" />
        <>{props.renderDefault(props)}</>
      </div>
    </div>
  );
}
