"use client";

import { useState, useEffect } from "react";
import { Password } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Share,
  Copy,
  Clock,
  Link as LinkIcon,
  Calendar,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCreateShareableLink,
  useShareableLinks,
} from "@/lib/hooks/use-sharing";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  password: Password;
}

export function ShareDialog({
  open,
  onOpenChange,
  password,
}: ShareDialogProps) {
  const [expiryOption, setExpiryOption] = useState<string>("never");
  const [customDate, setCustomDate] = useState<string>("");
  const [shareableLink, setShareableLink] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const createShareLinkMutation = useCreateShareableLink();
  const { refetch: refetchLinks } = useShareableLinks();

  useEffect(() => {
    if (!open) {
      setShareableLink("");
      setExpiryOption("never");
      setCustomDate("");
      setCopied(false);
    }
  }, [open]);

  const getExpiryDate = (): string | undefined => {
    if (expiryOption === "never") return undefined;

    const now = new Date();
    let expiryDate: Date;

    switch (expiryOption) {
      case "1hour":
        expiryDate = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case "1day":
        expiryDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case "1week":
        expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case "1month":
        expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      case "custom":
        if (!customDate) return undefined;
        expiryDate = new Date(customDate);
        break;
      default:
        return undefined;
    }

    return expiryDate.toISOString();
  };

  const handleCreateLink = async () => {
    try {
      const expiresAt = getExpiryDate();

      const result = await createShareLinkMutation.mutateAsync({
        passwordId: password.id,
        expiresAt,
      });

      const fullLink = `${window.location.origin}/shared/${result.token}`;
      setShareableLink(fullLink);
      // copy to clipboard
      await navigator.clipboard.writeText(fullLink);
      toast.success("Shareable link created successfully!");
    } catch (error) {
      toast.error("Failed to create shareable link");
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const itemName = password?.name || "";
  const itemType = "password";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share className="w-5 h-5" />
            Share Password
          </DialogTitle>
          <DialogDescription>
            Create a secure shareable link for "{itemName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!shareableLink ? (
            <>
              <div>
                <Label htmlFor="expiry">Link Expiration</Label>
                <Select value={expiryOption} onValueChange={setExpiryOption}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never expires</SelectItem>
                    <SelectItem value="1hour">1 hour</SelectItem>
                    <SelectItem value="1day">1 day</SelectItem>
                    <SelectItem value="1week">1 week</SelectItem>
                    <SelectItem value="1month">1 month</SelectItem>
                    <SelectItem value="custom">Custom date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {expiryOption === "custom" && (
                <div>
                  <Label htmlFor="customDate">Expiry Date & Time</Label>
                  <Input
                    id="customDate"
                    type="datetime-local"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="mt-2"
                  />
                </div>
              )}

              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Security Notice</span>
                </div>
                <p className="text-muted-foreground">
                  Anyone with this link will be able to view and import this{" "}
                  {itemType}. The link can be deactivated at any time from your
                  shared links page.
                </p>
              </div>

              <Button
                onClick={handleCreateLink}
                disabled={createShareLinkMutation.isPending}
                className="gap-2 w-full"
              >
                {createShareLinkMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LinkIcon className="w-4 h-4" />
                )}
                Create Shareable Link
              </Button>
            </>
          ) : (
            <>
              <div>
                <Label>Shareable Link</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={shareableLink}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    onClick={copyToClipboard}
                    size="sm"
                    variant="outline"
                    className="gap-2 shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Clock className="w-3 h-3" />
                  {expiryOption === "never"
                    ? "Never expires"
                    : expiryOption === "custom"
                    ? `Expires ${new Date(customDate).toLocaleString()}`
                    : `Expires in ${expiryOption.replace(
                        /(\d+)(\w+)/,
                        "$1 $2"
                      )}`}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-2 text-center">
                <p className="text-muted-foreground text-sm">
                  Link created successfully! Share it with others to give them
                  access to this {itemType}.
                </p>
                <Button
                  onClick={() => onOpenChange(false)}
                  variant="outline"
                  className="w-full"
                >
                  Done
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
