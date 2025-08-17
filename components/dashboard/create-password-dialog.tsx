"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { PasswordForm, passwordFormSchema } from "./password-form";
import { toast } from "sonner";
import { z } from "zod";
import { DialogDescription, DialogTitle } from "@radix-ui/react-dialog";
import { useCreatePassword } from "@/lib/hooks/use-passwords";

export function CreatePasswordDialog() {
  const [open, setOpen] = useState(false);
  const createPasswordMutation = useCreatePassword();

  const handleSubmit = async (values: z.infer<typeof passwordFormSchema>) => {
    try {
      await createPasswordMutation.mutateAsync(values);
      toast.success("Password created successfully!");
      setOpen(false);
    } catch (error) {
      toast.error("Failed to create password.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <PlusCircle className="w-4 h-4" />
          Create New Password
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Password</DialogTitle>
          <DialogDescription>
            Enter the details for your new password entry.
          </DialogDescription>
        </DialogHeader>
        <PasswordForm
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isLoading={createPasswordMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
