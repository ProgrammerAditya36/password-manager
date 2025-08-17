"use client";

import { Password } from "@prisma/client";
import { useState, useEffect } from "react";
import { CreatePasswordDialog } from "./create-password-dialog";
import { EditPasswordDialog } from "./edit-password-dialog";
import { ShareDialog } from "./share-dialog";
import { ViewPasswordDialog } from "./view-password-dialog";
import { ImportPasswordsDialog } from "./import-passwords-dialog";
import { DashboardSearch } from "./dashboard-search";
import { PasswordCards } from "./password-cards";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, Download } from "lucide-react";
import {
  useDeletePassword,
  useRefreshPasswords,
  useAllPasswords,
} from "@/lib/hooks/use-passwords";
import { exportPasswordsToCSV } from "@/lib/utils";

export function DashboardContent() {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPassword, setEditingPassword] = useState<Password | null>(null);
  const [viewingPassword, setViewingPassword] = useState<Password | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharingPassword, setSharingPassword] = useState<Password | null>(null);
  const [selectedPasswords, setSelectedPasswords] = useState<Set<string>>(
    new Set()
  );
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const deletePasswordMutation = useDeletePassword();
  const refreshPasswordsMutation = useRefreshPasswords();
  const { data: allPasswords, isLoading: isExporting } = useAllPasswords();

  const handleEditPassword = (password: Password) => {
    setEditingPassword(password);
    setIsEditDialogOpen(true);
  };

  const handleDeletePassword = async (passwordId: string) => {
    try {
      await deletePasswordMutation.mutateAsync(passwordId);
      toast.success("Password deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete password");
    }
  };

  const handlePasswordUpdated = (updatedPassword: Password) => {
    setEditingPassword(null);
    toast.success("Password updated successfully!");
  };

  const handleViewPassword = (password: Password) => {
    setViewingPassword(password);
  };

  const handleSharePassword = (password: Password) => {
    setSharingPassword(password);
    setShareDialogOpen(true);
  };

  const handleRefreshPasswords = async () => {
    try {
      await refreshPasswordsMutation.mutateAsync();
      toast.success("Passwords refreshed successfully!");
    } catch (error) {
      toast.error("Failed to refresh passwords");
    }
  };

  const handleImportComplete = () => {
    // Refresh the passwords list after import
    refreshPasswordsMutation.mutate();
  };

  const handleExportToCSV = () => {
    if (!allPasswords || allPasswords.length === 0) {
      toast.error("No passwords to export");
      return;
    }

    try {
      // Transform passwords to include import status and ensure proper date handling
      const passwordsForExport = allPasswords.map((password) => ({
        ...password,
        isImported: false, // Default to false for now
        importedAt: null,
        // Ensure dates are properly formatted - they might come as strings from the API
        createdAt: password.createdAt,
        updatedAt: password.updatedAt,
      }));

      exportPasswordsToCSV(
        passwordsForExport,
        `passwords-${new Date().toISOString().split("T")[0]}`
      );
      toast.success(`Exported ${allPasswords.length} passwords to CSV`);
    } catch (error) {
      toast.error("Failed to export passwords");
      console.error("Export error:", error);
    }
  };

  const handleBulkExport = () => {
    if (selectedPasswords.size === 0) {
      toast.error("No passwords selected");
      return;
    }

    try {
      const selectedPasswordData =
        allPasswords?.filter((p) => selectedPasswords.has(p.id)) || [];
      const passwordsForExport = selectedPasswordData.map((password) => ({
        ...password,
        isImported: false,
        importedAt: null,
        // Ensure dates are properly formatted
        createdAt: password.createdAt,
        updatedAt: password.updatedAt,
      }));

      exportPasswordsToCSV(
        passwordsForExport,
        `selected-passwords-${new Date().toISOString().split("T")[0]}`
      );
      toast.success(
        `Exported ${selectedPasswords.size} selected passwords to CSV`
      );

      // Reset selection
      setSelectedPasswords(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      toast.error("Failed to export selected passwords");
      console.error("Export error:", error);
    }
  };

  const togglePasswordSelection = (passwordId: string) => {
    const newSelection = new Set(selectedPasswords);
    if (newSelection.has(passwordId)) {
      newSelection.delete(passwordId);
    } else {
      newSelection.add(passwordId);
    }
    setSelectedPasswords(newSelection);
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedPasswords(new Set());
    }
  };

  const selectAllPasswords = () => {
    if (allPasswords) {
      const allIds = new Set(allPasswords.map((p) => p.id));
      setSelectedPasswords(allIds);
    }
  };

  const deselectAllPasswords = () => {
    setSelectedPasswords(new Set());
  };

  return (
    <div className="mx-auto p-6 min-h-screen container">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-bold text-3xl">Password Manager</h1>
          <p className="text-muted-foreground">
            Manage your passwords securely
          </p>
        </div>

        {/* Search Input */}
        <DashboardSearch />

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleRefreshPasswords}
            disabled={refreshPasswordsMutation.isPending}
            className="gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                refreshPasswordsMutation.isPending ? "animate-spin" : ""
              }`}
            />
            {refreshPasswordsMutation.isPending ? "Refreshing..." : "Refresh"}
          </Button>

          <Button
            variant="outline"
            onClick={toggleSelectionMode}
            className={`gap-2 ${
              isSelectionMode ? "bg-primary text-primary-foreground" : ""
            }`}
          >
            {isSelectionMode ? "Cancel Selection" : "Select Passwords"}
          </Button>

          {isSelectionMode && selectedPasswords.size > 0 && (
            <Button
              variant="outline"
              onClick={handleBulkExport}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export Selected ({selectedPasswords.size})
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleExportToCSV}
            disabled={isExporting || !allPasswords || allPasswords.length === 0}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Preparing..." : "Export All CSV"}
          </Button>

          <div className="opacity-100 pointer-events-auto">
            <ImportPasswordsDialog onImportComplete={handleImportComplete} />
          </div>

          <div className="opacity-100 pointer-events-auto">
            <CreatePasswordDialog />
          </div>
        </div>
      </div>

      {/* Selection mode indicator */}
      {isSelectionMode && (
        <div className="bg-muted mb-4 p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground text-sm">
              Select passwords to export. Click on password cards to
              select/deselect them.
              {selectedPasswords.size > 0 &&
                ` ${selectedPasswords.size} password(s) selected.`}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllPasswords}
                disabled={!allPasswords || allPasswords.length === 0}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deselectAllPasswords}
                disabled={selectedPasswords.size === 0}
              >
                Deselect All
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Password Cards Section */}
      <PasswordCards
        onEditPassword={handleEditPassword}
        onDeletePassword={handleDeletePassword}
        onSharePassword={handleSharePassword}
        onViewPassword={handleViewPassword}
        isSelectionMode={isSelectionMode}
        selectedPasswords={selectedPasswords}
        onTogglePasswordSelection={togglePasswordSelection}
      />

      <EditPasswordDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        password={editingPassword}
        onPasswordUpdated={handlePasswordUpdated}
      />

      <ViewPasswordDialog
        open={!!viewingPassword}
        onOpenChange={(open) => !open && setViewingPassword(null)}
        password={viewingPassword}
        onEdit={handleEditPassword}
      />

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        password={sharingPassword}
        group={null}
      />
    </div>
  );
}
