"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Password } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { Eye, EyeOff, Clipboard, RotateCcw } from "lucide-react";

// Define the schema for password validation
export const passwordFormSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters.",
    })
    .max(50, {
      message: "Name must not be longer than 50 characters.",
    }),
  username: z
    .string()
    .max(100, {
      message: "Username must not be longer than 100 characters.",
    })
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email({
      message: "Please enter a valid email address.",
    })
    .max(100, {
      message: "Email must not be longer than 100 characters.",
    })
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(6, {
      message: "Password must be at least 6 characters.",
    })
    .max(255, {
      message: "Password must not be longer than 255 characters.",
    }),
  website: z

    .url({
      message: "Please enter a valid URL.",
    })
    .max(255, {
      message: "Website URL must not be longer than 255 characters.",
    })
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .max(500, {
      message: "Description must not be longer than 500 characters.",
    })
    .optional()
    .or(z.literal("")),
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

interface PasswordFormProps {
  initialData?: Password | null;
  onSubmit: (values: PasswordFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  defaultName?: string;
}

export function PasswordForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  defaultName,
}: PasswordFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name ?? "",
          username: initialData.username ?? "",
          email: initialData.email ?? "",
          password: initialData.password ?? "",
          website: initialData.website ?? "",
          description: initialData.description ?? "",
        }
      : {
          name: defaultName || "",
          username: "",
          email: "",
          password: "",
          website: "",
          description: "",
        },
    mode: "onChange",
  });

  // Function to generate a random password
  const generatePassword = () => {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+";
    let newPassword = "";
    for (let i = 0; i < 16; i++) {
      // Generate a 16 character password
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    form.setValue("password", newPassword, { shouldValidate: true });
    toast.info("New password generated.");
  };

  // Function to copy generated password to clipboard
  const copyGeneratedPassword = () => {
    const generatedPassword = form.getValues("password");
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      toast.success("Password copied to clipboard.");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Google Login" {...field} />
              </FormControl>
              <FormDescription>
                A recognizable name for this password entry.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Your username" {...field} />
              </FormControl>
              <FormDescription>
                The username associated with this password.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Your email" {...field} />
              </FormControl>
              <FormDescription>
                The email associated with this password.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...field}
                    className="pr-24" // Make space for buttons
                  />
                  <div className="right-0 absolute inset-y-0 flex items-center space-x-1 pr-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={generatePassword}
                      title="Generate new password"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={copyGeneratedPassword}
                      title="Copy password"
                    >
                      <Clipboard className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </FormControl>
              <FormDescription>The password for this entry.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com" {...field} />
              </FormControl>
              <FormDescription>
                The website URL associated with this password.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional notes about this password..."
                  className="resize-y"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Any additional notes for this password.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? "Saving..."
              : initialData
              ? "Save Changes"
              : "Create Password"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
