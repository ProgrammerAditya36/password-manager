import { SignUp } from "@clerk/nextjs";
import { getCurrentUser } from "@/lib/actions/user";
import { redirect } from "next/navigation";

export default async function Page() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }
  return (
    <div className="flex justify-center items-center w-full h-full">
      <SignUp forceRedirectUrl={"/dashboard"} />
    </div>
  );
}
