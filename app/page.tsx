import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Lock,
  Key,
  Users,
  FileText,
  Zap,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { getCurrentUser } from "@/lib/actions/user";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="bg-background h-full">
      {/* Hero Section */}
      <section className="mx-auto px-4 py-20 text-center">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-6 font-bold text-foreground text-5xl">
            Secure Password Management Made Simple
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-muted-foreground text-xl">
            Store, organize, and share your passwords securely with end-to-end
            encryption. Never worry about forgetting passwords again.
          </p>
          <div className="flex sm:flex-row flex-col justify-center gap-4">
            {user ? (
              <Link href="/dashboard">
                <Button size="lg" className="px-8 py-6 text-lg">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/sign-up">
                <Button size="lg" className="px-8 py-6 text-lg">
                  Get Started
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
