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

  const initial = session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "M";

  return (
    <aside className="border-b border-stone-200/90 bg-white md:fixed md:inset-y-0 md:left-0 md:w-64 md:border-b-0 md:border-r md:border-stone-200/90 flex flex-col justify-between">
      {/* Brand Header & Navigation */}
      <div>
        <div className="flex items-center justify-between px-4 py-4 md:px-5 md:py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white font-bold text-sm tracking-wider shadow-sm">
              M
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-stone-900 leading-tight">Mess Portal</p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
                {title === "Admin" ? "Administration" : "Student Services"}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:gap-1 md:px-3 md:pb-0">
          {links.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-brand-50/80 text-brand-900 font-semibold border-l-2 border-brand-600 pl-2.5"
                    : "text-stone-600 hover:bg-stone-100/80 hover:text-stone-900"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Desktop User Panel */}
      <div className="hidden border-t border-stone-200/90 p-4 md:block">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-700">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-stone-900 leading-tight">
              {session?.user?.name || "User"}
            </p>
            <p className="truncate text-[11px] text-stone-500 font-mono">
              {session?.user?.email}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn-secondary w-full text-xs py-1.5"
        >
          Sign out
        </button>
      </div>

      {/* Mobile User Bar */}
      <div className="flex items-center justify-between border-t border-stone-100 px-4 py-2.5 md:hidden bg-stone-50/50">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-200 text-[10px] font-semibold text-stone-700">
            {initial}
          </div>
          <span className="truncate text-xs font-medium text-stone-700">{session?.user?.name}</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs font-semibold text-stone-600 hover:text-stone-900 ml-2"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
