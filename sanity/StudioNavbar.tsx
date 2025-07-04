"use client";

import { ArrowLeftIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { type NavbarProps } from "sanity";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export function StudioNavbar(props: NavbarProps) {
  return (
    <div>
      <div className="flex items-center justify-between border-b p-2">
        <Link href="/dashboard">
          <Button variant="ghost" className="flex items-center gap-2">
            <ArrowLeftIcon className="h-5 w-5" />
            Go to Dashboard
          </Button>
        </Link>
        <div className="flex items-center justify-center p-2">
          <Logo />
        </div>
      </div>
      <>{props.renderDefault(props)}</>
    </div>
  );
}
