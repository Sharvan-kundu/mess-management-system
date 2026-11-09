import Sidebar from "@/components/Sidebar";

const links = [
  { href: "/student/dashboard", label: "Weekly Menu" },
  { href: "/student/dashboard/attendance", label: "My Attendance" },
  { href: "/student/dashboard/profile", label: "Profile" },
];

export default function StudentLayout({ children }) {
  return (
    <div className="min-h-screen">
      <Sidebar title="Student" links={links} />
      <main className="mx-auto max-w-5xl p-4 md:ml-60 md:p-8">{children}</main>
    </div>
  );
}
