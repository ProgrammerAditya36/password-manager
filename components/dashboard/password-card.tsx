"use client";

import { Password } from "@prisma/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  MoreVertical,
  Edit,
  Share,
  Trash2,
  ExternalLink,
  Eye,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { exportPasswordsToCSV } from "@/lib/utils";
import Link from "next/link";

interface PasswordCardProps {
  password: Password & {
    isImported?: boolean;
    importedAt?: Date;
  };
  onEdit?: (password: Password) => void;
  onDelete?: (passwordId: string) => void;
  onShare?: (password: Password) => void;
  onView?: (password: Password) => void;
  compact?: boolean;
  isSelected?: boolean;
  onSelectionToggle?: () => void;
  showSelection?: boolean;
}

export function PasswordCard({
  password,
  onEdit,
  onDelete,
  onShare,
  onView,
  compact = false,
  isSelected = false,
  onSelectionToggle,
  showSelection = false,
}: PasswordCardProps) {
  const [showField, setShowField] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (err) {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(password.id);
      toast.success("Password deleted successfully");
    } catch (error) {
      toast.error("Failed to delete password");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportSinglePassword = () => {
    try {
      const passwordForExport = [
        {
          ...password,
          isImported: password.isImported || false,
          importedAt: password.importedAt || null,
          // Ensure dates are properly formatted
          createdAt: password.createdAt,
          updatedAt: password.updatedAt,
        },
      ];

      exportPasswordsToCSV(
        passwordForExport,
        `password-${password.name.replace(/[^a-zA-Z0-9]/g, "-")}`
      );
      toast.success("Password exported to CSV");
    } catch (error) {
      toast.error("Failed to export password");
      console.error("Export error:", error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper for field UI: hover to reveal, click to copy
  const FieldCopyReveal = ({
    label,
    value,
    isPassword = false,
    maxWidth,
  }: {
    label: string;
    value?: string | null;
    isPassword?: boolean;
    maxWidth?: string;
  }) => {
    if (!value) return null;
    return (
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground text-sm">{label}</span>
        <div
          className="group/field relative flex items-center space-x-2"
          onMouseEnter={() => {
            // Add a slight delay before revealing
            clearTimeout((FieldCopyReveal as any)._revealTimeout);
            (FieldCopyReveal as any)._revealTimeout = setTimeout(
              () => setShowField(label),
              350
            );
          }}
          onMouseLeave={() => {
            // Add a slight delay before hiding
            clearTimeout((FieldCopyReveal as any)._revealTimeout);
            (FieldCopyReveal as any)._revealTimeout = setTimeout(() => {
              setShowField((prev) => (prev === label ? null : prev));
            }, 350);
          }}
        >
          <button
            type="button"
            className={`bg-transparent px-0 border-none outline-none font-mono text-sm cursor-pointer text-left transition-all duration-200 truncate ${
              maxWidth ? maxWidth : ""
            }`}
            style={{ background: "none" }}
            onClick={() => copyToClipboard(value, label)}
            tabIndex={0}
            aria-label={`Copy ${label.toLowerCase()}`}
          >
            {showField === label ? (
              value
            ) : isPassword ? (
              "••••••••"
            ) : (
              <span className={`truncate block ${maxWidth ? maxWidth : ""}`}>
                {value}
              </span>
            )}
          </button>
          <Copy className="w-3 h-3 text-muted-foreground transition-all duration-200 pointer-events-none" />
        </div>
      </div>
    );
  };

  return (
    <Card
      className={`group flex flex-col hover:shadow-md h-full min-h-[320px]  ${
        showSelection ? "cursor-pointer" : ""
      } ${isSelected ? "ring-2 ring-primary" : ""}`}
      onClick={showSelection ? onSelectionToggle : undefined}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            {showSelection && (
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectionToggle?.();
                }}
              >
                {isSelected && (
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            )}
            <div className="flex justify-center items-center bg-primary/10 rounded-full w-10 h-10">
              <span className="font-semibold text-primary text-sm">
                {getInitials(password.name)}
              </span>
            </div>
            <div>
              <CardTitle className="text-lg">{password.name}</CardTitle>
              {password.website && (
                <CardDescription className="flex items-center gap-1">
                  <Link
                    href={password.website}
                    target="_blank"
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate">
                      {password.website.slice(0, 30)}
                      {password.website.length > 30 && "..."}
                    </span>
                  </Link>
                </CardDescription>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(password)}>
                  <Eye className="mr-2 w-4 h-4" />
                  View
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(password)}>
                  <Edit className="mr-2 w-4 h-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onShare && (
                <DropdownMenuItem onClick={() => onShare(password)}>
                  <Share className="mr-2 w-4 h-4" />
                  Share
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleExportSinglePassword}>
                <Download className="mr-2 w-4 h-4" />
                Export to CSV
              </DropdownMenuItem>
              {onDelete && (
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-600"
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 w-4 h-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-2">
          {password.isImported && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Download className="w-3 h-3" />
              Imported
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <FieldCopyReveal label="Username" value={password.username} />
        <FieldCopyReveal
          label="Email"
          value={password.email}
          maxWidth="max-w-[150px]"
        />
        <FieldCopyReveal
          label="Password"
          value={password.password}
          isPassword
        />
        {password.description && (
          <div>
            <span className="text-muted-foreground text-sm">Description</span>
            <p className="mt-1 text-sm">{password.description}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t min-h-[40px]">
        <div className="flex justify-between items-center w-full text-muted-foreground text-xs">
          <span>
            {password.isImported && password.importedAt
              ? `Imported ${new Date(password.importedAt).toLocaleDateString()}`
              : `Created ${new Date(password.createdAt).toLocaleDateString()}`}
          </span>
          {!password.isImported &&
            password.updatedAt !== password.createdAt && (
              <span>
                Updated {new Date(password.updatedAt).toLocaleDateString()}
              </span>
            )}
        </div>
      </CardFooter>
    </Card>
  );
}
