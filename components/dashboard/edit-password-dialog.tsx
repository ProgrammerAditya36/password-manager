"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Password } from "@prisma/client";
import { PasswordForm, passwordFormSchema } from "./password-form";
import { toast } from "sonner";
import { z } from "zod";
import { useUpdatePassword } from "@/lib/hooks/use-passwords";

interface EditPasswordDialogProps {
  password: Password | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPasswordUpdated?: (updatedPassword: Password) => void;
}

export function EditPasswordDialog({
  password,
  open,
  onOpenChange,
  onPasswordUpdated,
}: EditPasswordDialogProps) {
  const updatePasswordMutation = useUpdatePassword();

  // Reset form when password prop changes
  const initialData: z.infer<typeof passwordFormSchema> | undefined = password
    ? {
        name: password.name,
        username: password.username || "",
        email: password.email || "",
        password: password.password, // This is the encrypted password from DB
        website: password.website || "",
        description: password.description || "",
      }
    : undefined;

  const handleSubmit = async (values: z.infer<typeof passwordFormSchema>) => {
    if (!password) return; // Should not happen if dialog is open with a password

    try {
      const updatedPassword = await updatePasswordMutation.mutateAsync({
        id: password.id,
        ...values,
      });

      toast.success("Password updated successfully!");
      onPasswordUpdated?.(updatedPassword);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update password.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {password ? `Edit "${password.name}"` : "Edit Password"}
          </DialogTitle>
          <DialogDescription>
            Make changes to your password entry here.
          </DialogDescription>
        </DialogHeader>
        {typeof initialData !== "undefined" && (
          <PasswordForm
            initialData={password}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            isLoading={updatePasswordMutation.isPending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
