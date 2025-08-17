"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Password } from "@prisma/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Key,
  FolderOpen,
  Copy,
  Eye,
  ExternalLink,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { PasswordForm, passwordFormSchema } from "./password-form";
import { useCreatePassword } from "@/lib/hooks/use-passwords";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ViewPasswordDialog } from "./view-password-dialog";

export type PasswordWithGroup = Password & {
  passwordGroup?: {
    name: string;
    id: string;
  };
};

interface SearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  passwords: PasswordWithGroup[];
  onSelectPassword?: (password: PasswordWithGroup) => void;
  onEditPassword?: (password: PasswordWithGroup) => void;
}

interface SearchResult {
  id: string;
  type: "password" | "group";
  title: string;
  subtitle?: string;
  website?: string;
  group?: string;
  data: PasswordWithGroup;
}

export function SearchCommand({
  open,
  onOpenChange,
  passwords,
  onSelectPassword,
  onEditPassword,
}: SearchCommandProps) {
  const [search, setSearch] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState<{ name: string } | null>(
    null
  );
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingPassword, setViewingPassword] =
    useState<PasswordWithGroup | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const createPasswordMutation = useCreatePassword();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("password-manager-recent-searches");
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return;

    const updated = [query, ...recentSearches.filter((s) => s !== query)].slice(
      0,
      5
    );
    setRecentSearches(updated);
    localStorage.setItem(
      "password-manager-recent-searches",
      JSON.stringify(updated)
    );
  };

  // Create searchable results
  const searchResults = useMemo((): SearchResult[] => {
    const results: SearchResult[] = [];

    // Add passwords
    passwords.forEach((password) => {
      results.push({
        id: `password-${password.id}`,
        type: "password",
        title: password.name,
        subtitle: password.username || password.email || "No username",
        website: password.website || undefined,
        group: password.passwordGroup?.name,
        data: password,
      });
    });

    return results;
  }, [passwords]);

  // Filter results based on search
  const filteredResults = useMemo(() => {
    if (!search.trim()) return searchResults;

    const query = search.toLowerCase().trim();

    return searchResults.filter((result) => {
      const searchableText = [
        result.title,
        result.subtitle,
        result.website,
        result.group,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [searchResults, search]);

  // Create a combined list of all selectable items for keyboard navigation
  const selectableItems = useMemo(() => {
    const items: Array<{
      type: "recent" | "password" | "group" | "create";
      data: any;
      action: () => void;
    }> = [];

    // Add recent searches when no search term
    if (!search && recentSearches.length > 0) {
      recentSearches.forEach((recent) => {
        items.push({
          type: "recent",
          data: recent,
          action: () => setSearch(recent),
        });
      });
    }

    // Add filtered password results
    filteredResults
      .filter((result) => result.type === "password")
      .forEach((result) => {
        items.push({
          type: "password",
          data: result,
          action: () => handleSelect(result),
        });
      });

    // Add filtered group results
    filteredResults
      .filter((result) => result.type === "group")
      .forEach((result) => {
        items.push({
          type: "group",
          data: result,
          action: () => handleSelect(result),
        });
      });

    // Add create action when search term exists
    if (search) {
      items.push({
        type: "create",
        data: search,
        action: () => handleCreatePassword(search),
      });
    }

    return items;
  }, [search, recentSearches, filteredResults]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
      onOpenChange(false);
    } catch (err) {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const handleSelect = (result: SearchResult) => {
    saveRecentSearch(search);

    if (result.type === "password") {
      // Default action is to view the password
      handleViewPassword(result.data as PasswordWithGroup);
    } else {
      onOpenChange(false);
    }
  };

  const handleViewPassword = (password: PasswordWithGroup) => {
    setViewingPassword(password);
    setViewDialogOpen(true);
    onOpenChange(false);
  };

  const handleEditPassword = (password: PasswordWithGroup) => {
    onEditPassword?.(password);
    setViewDialogOpen(false);
    onOpenChange(false);
  };

  const handleCreatePassword = (searchTerm: string) => {
    setCreateFormData({ name: searchTerm });
    onOpenChange(false); // Close the search dialog first
    // Use a small timeout to ensure the search dialog closes before opening create dialog
    setTimeout(() => {
      setCreateDialogOpen(true);
    }, 150);
  };

  const handleCreateDialogClose = () => {
    setCreateDialogOpen(false);
    setCreateFormData(null);
  };

  const handleCreatePasswordSubmit = async (
    values: z.infer<typeof passwordFormSchema>
  ) => {
    try {
      await createPasswordMutation.mutateAsync(values);
      toast.success("Password created successfully!");
      handleCreateDialogClose();
    } catch (error) {
      toast.error("Failed to create password.");
    }
  };

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Reset selected index when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [selectableItems]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < selectableItems.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          if (selectableItems[selectedIndex]) {
            selectableItems[selectedIndex].action();
          }
          break;
        case "Escape":
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedIndex, selectableItems, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search passwords..."
        value={search}
        onValueChange={setSearch}
      />

      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-6">
            <Search className="w-8 h-8 text-muted-foreground" />
            <p>No passwords found.</p>
            <p className="text-muted-foreground text-sm">
              Try searching for a different term.
            </p>
          </div>
        </CommandEmpty>

        {/* Recent searches */}
        {!search && recentSearches.length > 0 && (
          <CommandGroup heading="Recent searches">
            {recentSearches.map((recent, index) => (
              <CommandItem
                key={`recent-${index}`}
                value={recent}
                onSelect={() => setSearch(recent)}
                className={selectedIndex === index ? "bg-accent" : ""}
              >
                <Clock className="mr-2 w-4 h-4 text-muted-foreground" />
                {recent}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Passwords */}
        {filteredResults.some((r) => r.type === "password") && (
          <CommandGroup heading="Passwords">
            {filteredResults
              .filter((result) => result.type === "password")
              .map((result, index) => {
                const password = result.data as PasswordWithGroup;
                const recentCount =
                  !search && recentSearches.length > 0
                    ? recentSearches.length
                    : 0;
                const itemIndex = recentCount + index;
                return (
                  <CommandItem
                    key={result.id}
                    value={`${result.title} ${result.subtitle} ${
                      result.website || ""
                    } ${result.group || ""}`}
                    onSelect={() => handleSelect(result)}
                    className={`flex justify-between items-center p-3 ${
                      selectedIndex === itemIndex ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex flex-1 items-center space-x-3 min-w-0">
                      <div className="flex flex-shrink-0 justify-center items-center bg-primary/10 rounded w-8 h-8">
                        <Key className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{result.title}</p>
                          {result.group && (
                            <Badge variant="secondary" className="text-xs">
                              {result.group}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          {result.subtitle && (
                            <span className="truncate">{result.subtitle}</span>
                          )}
                          {result.website && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 truncate">
                                <ExternalLink className="w-3 h-3" />
                                {result.website}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(
                            password.username || password.email || "",
                            "Username"
                          );
                        }}
                        className="hover:bg-accent opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                        title="Copy username"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(password.password, "Password");
                        }}
                        className="hover:bg-accent opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                        title="Copy password"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewPassword(password);
                        }}
                        className="hover:bg-accent opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                        title="View password"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    </div>
                  </CommandItem>
                );
              })}
          </CommandGroup>
        )}

        {/* Quick actions */}
        {search && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Quick Actions">
              <CommandItem
                onSelect={() => handleCreatePassword(search)}
                className={`${
                  selectedIndex === selectableItems.length - 1
                    ? "bg-accent"
                    : ""
                }`}
              >
                <Key className="mr-2 w-4 h-4" />
                Create new password for "{search}"
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>

      {/* Create Password Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={handleCreateDialogClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Password</DialogTitle>
            <DialogDescription>
              Enter the details for your new password entry.
            </DialogDescription>
          </DialogHeader>
          <PasswordForm
            initialData={null}
            onSubmit={handleCreatePasswordSubmit}
            onCancel={handleCreateDialogClose}
            isLoading={createPasswordMutation.isPending}
            defaultName={createFormData?.name}
          />
        </DialogContent>
      </Dialog>

      {/* View Password Dialog */}
      <ViewPasswordDialog
        password={viewingPassword}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        onEdit={handleEditPassword}
      />
    </CommandDialog>
  );
}
