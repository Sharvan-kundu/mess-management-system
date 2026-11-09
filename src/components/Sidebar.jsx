"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

/** Responsive nav: sidebar on md+, top bar on mobile. */
export default function Sidebar({ title, links }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (href) =>
    href === links[0].href ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="border-b border-slate-200 bg-white md:fixed md:inset-y-0 md:left-0 md:w-60 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between px-4 py-3 md:block md:px-5 md:py-5">
        <div>
          <p className="text-base font-semibold text-brand-700">Mess Manager</p>
          <p className="text-xs text-slate-500">{title}</p>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3 md:pb-0">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive(l.href)
                ? "bg-brand-50 text-brand-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="hidden border-t border-slate-200 p-4 md:absolute md:bottom-0 md:left-0 md:block md:w-full">
        <p className="truncate text-sm font-medium">{session?.user?.name}</p>
        <p className="truncate text-xs text-slate-500">{session?.user?.email}</p>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="btn-secondary mt-3 w-full">
          Sign out
        </button>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 md:hidden">
        <span className="truncate text-xs text-slate-500">{session?.user?.name}</span>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-xs font-medium text-red-600">
          Sign out
        </button>
      </div>
    </aside>
  );
}
