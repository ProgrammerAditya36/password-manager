import { getCurrentUser } from "@/lib/actions/user";
import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default async function Page() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }
  return (
    <div className="flex justify-center items-center w-full h-full">
      <SignIn forceRedirectUrl={"/dashboard"} />
    </div>
  );
}
