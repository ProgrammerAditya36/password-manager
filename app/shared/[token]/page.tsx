"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  Eye,
  EyeOff,
  Copy,
  Check,
  Clock,
  User,
  Lock,
  Globe,
  Mail,
  FileText,
  Shield,
  Calendar,
  Loader2,
} from "lucide-react";
import {
  useSharedContent,
  useImportSharedContent,
} from "@/lib/hooks/use-sharing";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

export default function SharedContentPage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const token = params.token as string;

  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [showImportDialog, setShowImportDialog] = useState(false);

  const { data: sharedContent, isLoading, error } = useSharedContent(token);
  const importMutation = useImportSharedContent();

  const togglePasswordVisibility = (id: string) => {
    setShowPassword((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied((prev) => ({ ...prev, [id]: true }));
      toast.success("Copied to clipboard!");
      setTimeout(() => {
        setCopied((prev) => ({ ...prev, [id]: false }));
      }, 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleImport = async () => {
    if (!isSignedIn) {
      toast.error("Please sign in to import this content");
      router.push("/sign-in");
      return;
    }

    try {
      await importMutation.mutateAsync(token);
      toast.success("Content imported successfully!");
      setShowImportDialog(false);
      router.push("/");
    } catch (error: any) {
      if (error.message.includes("already imported")) {
        toast.error("You have already imported this content");
      } else {
        toast.error("Failed to import content");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center bg-background min-h-screen">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground">Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center bg-background p-4 min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="w-5 h-5" />
              Content Unavailable
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              {error.message || "This shared link is no longer available."}
            </p>
            <Button onClick={() => router.push("/")} variant="outline">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sharedContent) return null;

  const isExpired =
    sharedContent.expiresAt && new Date(sharedContent.expiresAt) < new Date();

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto p-4 max-w-4xl container">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="font-bold text-2xl">Shared Content</h1>
              <p className="text-muted-foreground">
                Shared by {sharedContent.sharedBy || "Anonymous"}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {sharedContent.expiresAt && (
                <Badge
                  variant={isExpired ? "destructive" : "secondary"}
                  className="gap-1"
                >
                  <Clock className="w-3 h-3" />
                  {isExpired
                    ? "Expired"
                    : `Expires ${new Date(
                        sharedContent.expiresAt
                      ).toLocaleDateString()}`}
                </Badge>
              )}
              <Badge variant="outline" className="gap-1">
                <Calendar className="w-3 h-3" />
                Shared {new Date(sharedContent.createdAt).toLocaleDateString()}
              </Badge>
            </div>
          </div>

          {!isExpired && (
            <div className="flex justify-end">
              <Button
                onClick={() => setShowImportDialog(true)}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Import to My Account
              </Button>
            </div>
          )}
        </div>

        {sharedContent.password && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                {sharedContent.password.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sharedContent.password.username && (
                <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Username</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">
                      {sharedContent.password.username}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(
                          sharedContent.password!.username!,
                          "username"
                        )
                      }
                    >
                      {copied.username ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {sharedContent.password.email && (
                <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Email</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">
                      {sharedContent.password.email}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(sharedContent.password!.email!, "email")
                      }
                    >
                      {copied.email ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Password</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">
                    {showPassword.password
                      ? sharedContent.password.password
                      : "••••••••"}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => togglePasswordVisibility("password")}
                  >
                    {showPassword.password ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      copyToClipboard(
                        sharedContent.password!.password,
                        "password"
                      )
                    }
                  >
                    {copied.password ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {sharedContent.password.website && (
                <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Website</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">
                      {sharedContent.password.website}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(
                          sharedContent.password!.website!,
                          "website"
                        )
                      }
                    >
                      {copied.website ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {sharedContent.password.description && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Description</span>
                  </div>
                  <p className="text-muted-foreground">
                    {sharedContent.password.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Import to Your Account</AlertDialogTitle>
              <AlertDialogDescription>
                {isSignedIn
                  ? `This will import the shared password  to your password manager. You'll be able to access it from your dashboard.`
                  : "You need to sign in to import this content to your account."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              {isSignedIn ? (
                <AlertDialogAction
                  onClick={handleImport}
                  disabled={importMutation.isPending}
                >
                  {importMutation.isPending && (
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  )}
                  Import
                </AlertDialogAction>
              ) : (
                <AlertDialogAction onClick={() => router.push("/sign-in")}>
                  Sign In
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
