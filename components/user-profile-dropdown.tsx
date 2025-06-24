"use client";

import Link from "next/link";
import { User, Settings, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogoutButton } from "@/components/auth/logout-button";
import { UserData } from "@/lib/utils";
import { IconCrown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { DarkModeToggle } from "./darkmode-toggle";

interface UserType {
  email?: string;
  userData?: UserData | null;
}

interface UserProfileDropdownProps {
  user: UserType;
}

export function UserProfileDropdown({ user }: UserProfileDropdownProps) {
  // Get user data from userData or fallback to email
  const userData = user.userData;
  const displayName = userData?.name || user.email?.split("@")[0] || "User";
  const displayEmail = userData?.email || user.email || "";
  const isPremium = userData?.type === "PREMIUM";
  // const avatar = userData?.avatar;

  // Get user initials for avatar fallback
  // const getInitials = (name?: string | null, email?: string) => {
  //   if (name) {
  //     return name
  //       .split(" ")
  //       .map((word) => word[0])
  //       .join("")
  //       .toUpperCase()
  //       .slice(0, 2);
  //   }
  //   return email ? email[0].toUpperCase() : "U";
  // };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 text-muted-foreground bg-muted rounded-full border border-muted-foreground/20"
        >
          <UserIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none flex items-center">
              <span
                className={cn(
                  "mr-1 line-clamp-1",
                  isPremium &&
                    "bg-gradient-to-r from-teal-500 to-sky-200 dark:from-teal-400 dark:to-sky-200 bg-clip-text text-transparent"
                )}
              >
                {displayName}
              </span>
              {isPremium && (
                <div className="flex items-center justify-center bg-teal-500/30 dark:bg-teal-500/20 border border-teal-500 dark:border-teal-500/50 rounded-full p-0.5 ml-1">
                  <IconCrown className="h-4 w-4 text-teal-500 dark:text-teal-500" />
                </div>
              )}
            </p>
            <p className="text-xs line-clamp-1 leading-none text-muted-foreground">
              {displayEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/account" className="flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <div className="flex items-center w-full gap-4 p-2">
          <DropdownMenuItem asChild>
            <DarkModeToggle />
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <LogoutButton
              variant="outline"
              size="sm"
              className="justify-end hover:bg-transparent hover:text-foreground p-4 cursor-pointer"
            >
              Log out
            </LogoutButton>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
