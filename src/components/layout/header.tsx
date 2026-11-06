"use client";

import { Bell, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function Header({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  return (
    <header className="flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
      <Button variant="ghost" className="px-2 lg:hidden" onClick={onMenu} aria-label="Open navigation">
        <Menu className="size-5" />
      </Button>
      <div className="relative hidden max-w-md flex-1 sm:block">
        <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
        <Input className="pl-9" placeholder="Search orders, materials, inspections..." />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" className="relative px-3" aria-label="Notifications">
          <Bell className="size-5" />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-orange-600" />
        </Button>
        <div className="grid size-9 place-items-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700">
          VR
        </div>
        <Button variant="ghost" onClick={logout}>Sign out</Button>
      </div>
    </header>
  );
}
