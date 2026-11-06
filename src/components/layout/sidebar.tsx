"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  Factory,
  FileCheck2,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  PackageCheck,
  PackageSearch,
  ShoppingCart,
  Truck,
  Users,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { canAccessRoute, USER_ROLES, type UserRole } from "@/lib/auth/permissions";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Workflow", href: "/workflow", icon: Workflow },
  { name: "Orders", href: "/orders", icon: FileCheck2 },
  { name: "Engineering", href: "/engineering", icon: Workflow },
  { name: "Projects", href: "/projects", icon: Factory },
  { name: "Procurement", href: "/procurement", icon: ShoppingCart },
  { name: "Materials", href: "/materials", icon: Boxes },
  { name: "Incoming QA", href: "/incoming-qa", icon: PackageSearch },
  { name: "Production", href: "/production", icon: Gauge },
  { name: "Quality", href: "/quality", icon: FlaskConical },
  { name: "Final Inspection", href: "/final-inspection", icon: ClipboardCheck },
  { name: "Dispatch", href: "/dispatch", icon: Truck },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Users", href: "/users", icon: Users },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole>("sales_projects");

  useEffect(() => {
    void createClient().auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await createClient()
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile && USER_ROLES.includes(profile.role as UserRole)) {
        setRole(profile.role as UserRole);
      }
    });
  }, []);

  return (
    <>
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800 bg-slate-950 text-white transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
          <div className="grid size-9 place-items-center rounded-lg bg-orange-600">
            <PackageCheck className="size-5" />
          </div>
          <div>
            <p className="font-semibold">JSPL Machinery</p>
            <p className="text-xs text-slate-400">Manufacturing & Quality</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navigation.filter((item) => canAccessRoute(role, item.href)).map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white",
                  active && "bg-orange-600 text-white hover:bg-orange-600",
                )}
              >
                <item.icon className="size-4.5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-800 p-4 text-xs text-slate-500">Raipur Machinery Division</div>
      </aside>
    </>
  );
}
