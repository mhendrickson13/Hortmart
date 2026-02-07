import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();
  
  // If user is logged in and is admin/creator, go to dashboard
  if (session?.user) {
    if (session.user.role === "ADMIN" || session.user.role === "CREATOR") {
      redirect("/dashboard");
    }
  }
  
  // Default: go to courses page
  redirect("/courses");
}
