import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import ThemeToggleButton from "./theme/theme-toggle-button";
import { Button } from "./ui/button";
import Link from "next/link";

const Navbar = () => {
  return (
    <header className="flex justify-between items-center gap-4 bg-card p-4 w-full h-16 min-h-16 max-h-16 overflow-hidden text-card-foreground">
      <div className="flex items-center space-x-2">
        <Link href="/" className="font-bold text-primary text-xl">
          SecurePass
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggleButton variant="circle-blur" start="top-right" />
        <SignedOut>
          <SignInButton>
            <Button className="inline-flex justify-center items-center gap-2 bg-input hover:bg-background border border-background text-card-foreground transition-colors">
              Sign In
            </Button>
          </SignInButton>
          <SignUpButton>
            <Button className="inline-flex justify-center items-center gap-2 bg-background hover:bg-input border border-input text-card-foreground transition-colors">
              Sign Up
            </Button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <Link href="/dashboard">
            <Button variant="ghost">Dashboard</Button>
          </Link>
          <UserButton />
        </SignedIn>
      </div>
    </header>
  );
};
export default Navbar;
