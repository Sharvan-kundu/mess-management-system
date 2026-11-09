import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// "/" just forwards to the right place based on the session role
export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  redirect(session.user.role === "admin" ? "/admin/dashboard" : "/student/dashboard");
}
