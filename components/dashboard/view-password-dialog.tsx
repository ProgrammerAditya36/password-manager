"use client";

import { useState } from "react";
import { Password } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  Edit,
  Share,
  User,
  Mail,
  Globe,
  Shield,
  FileText,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

interface ViewPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  password: Password | null;
  onEdit?: (password: Password) => void;
  onShare?: (password: Password) => void;
}

export function ViewPasswordDialog({
  open,
  onOpenChange,
  password,
  onEdit,
  onShare,
}: ViewPasswordDialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<Record<string, boolean>>({});

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied((prev) => ({ ...prev, [field]: true }));
      toast.success(`${field} copied to clipboard!`);
      setTimeout(() => {
        setCopied((prev) => ({ ...prev, [field]: false }));
      }, 2000);
    } catch (error) {
      toast.error(`Failed to copy ${field}`);
    }
  };

  if (!password) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl">{password.name}</DialogTitle>
              {password.website && (
                <p className="mt-1 text-muted-foreground text-sm">
                  {password.website}
                </p>
              )}
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="outline" className="gap-1">
                  <Calendar className="w-3 h-3" />
                  Created {new Date(password.createdAt).toLocaleDateString()}
                </Badge>
              </div>
            </div>
            <div className="flex space-x-2">
              {onShare && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onShare(password)}
                  className="gap-2"
                >
                  <Share className="w-4 h-4" />
                  Share
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(password)}
                  className="gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {password.username && (
            <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Username</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{password.username}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    copyToClipboard(password.username!, "Username")
                  }
                >
                  {copied.Username ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {password.email && (
            <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Email</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{password.email}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(password.email!, "Email")}
                >
                  {copied.Email ? (
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
              <span className="font-mono text-sm">
                {showPassword ? password.password : "••••••••"}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(password.password, "Password")}
              >
                {copied.Password ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {password.website && (
            <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Website</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={password.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary text-sm hover:underline"
                >
                  {password.website}
                </a>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(password.website!, "Website")}
                >
                  {copied.Website ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {password.description && (
            <>
              <Separator />
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Description</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  {password.description}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
