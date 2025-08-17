import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Export passwords to CSV format
 * @param passwords Array of passwords to export
 * @param filename Name of the CSV file (without extension)
 */
export function exportPasswordsToCSV(
  passwords: Array<{
    name: string;
    username?: string | null;
    email?: string | null;
    password: string;
    website?: string | null;
    description?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    isImported?: boolean;
    importedAt?: Date | string | null;
  }>,
  filename: string = "passwords"
): void {
  if (passwords.length === 0) {
    console.warn("No passwords to export");
    return;
  }

  // Helper function to safely format dates
  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return "";
    if (typeof date === "string") {
      try {
        return new Date(date).toLocaleDateString();
      } catch {
        return date; // Return the string as-is if parsing fails
      }
    }
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    return "";
  };

  // Define CSV headers
  const headers = [
    "Name",
    "Username",
    "Email",
    "Password",
    "Website",
    "Description",
    "Created Date",
    "Last Updated",
    "Import Status",
    "Imported Date",
  ];

  // Convert passwords to CSV rows
  const csvRows = passwords.map((password) => [
    `"${(password.name || "").replace(/"/g, '""')}"`,
    `"${(password.username || "").replace(/"/g, '""')}"`,
    `"${(password.email || "").replace(/"/g, '""')}"`,
    `"${(password.password || "").replace(/"/g, '""')}"`,
    `"${(password.website || "").replace(/"/g, '""')}"`,
    `"${(password.description || "").replace(/"/g, '""')}"`,
    `"${formatDate(password.createdAt)}"`,
    `"${formatDate(password.updatedAt)}"`,
    `"${password.isImported ? "Imported" : "Created"}"`,
    `"${formatDate(password.importedAt)}"`,
  ]);

  // Combine headers and rows
  const csvContent = [headers, ...csvRows]
    .map((row) => row.join(","))
    .join("\n");

  // Add BOM for Excel compatibility
  const BOM = "\uFEFF";
  const csvWithBOM = BOM + csvContent;

  // Create and download the file
  const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up the URL object
  }
}
