import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import ThemeToggleButton from "./theme/theme-toggle-button";
import { Button } from "./ui/button";

const Navbar = () => {
  return (
    <header className="flex justify-end items-center gap-4 bg-card p-4 w-full h-16 min-h-16 max-h-16 overflow-hidden text-card-foreground">
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
        <UserButton />
      </SignedIn>
    </header>
  );
};
export default Navbar;
