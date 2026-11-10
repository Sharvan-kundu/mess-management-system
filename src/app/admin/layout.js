import Sidebar from "@/components/Sidebar";

const links = [
  { href: "/admin/dashboard", label: "Attendance" },
  { href: "/admin/dashboard/students", label: "Students" },
  { href: "/admin/dashboard/menu", label: "Weekly Menu" },
  { href: "/admin/dashboard/reports", label: "Monthly Reports" },
  { href: "/admin/dashboard/settings", label: "Notices & Closures" },
];

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#fbfaf8]">
      <Sidebar title="Admin" links={links} />
      <main className="mx-auto max-w-5xl p-4 md:ml-64 md:p-8">{children}</main>
    </div>
  );
}
