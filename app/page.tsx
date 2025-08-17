import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function HomePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return <DashboardContent user={user} />;
}
