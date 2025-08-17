/**
 * File processing utilities for different file types
 */

export interface FileContent {
  text: string;
  type: "csv" | "text" | "image" | "pdf";
  fileName: string;
}

/**
 * Extract text content from different file types
 */
export async function extractFileContent(file: File): Promise<FileContent> {
  const fileName = file.name.toLowerCase();

  try {
    if (fileName.endsWith(".csv")) {
      const text = await file.text();
      return { text, type: "csv", fileName: file.name };
    }

    if (fileName.endsWith(".pdf")) {
      // For PDFs, we'll try to extract text
      // Note: This is a simplified approach - in production you might want to use a proper PDF library
      const text = await file.text();
      return { text, type: "pdf", fileName: file.name };
    }

    if (fileName.match(/\.(jpg|jpeg|png|gif|bmp)$/i)) {
      // For images, we'll convert to base64 and send to AI for processing
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const text = `Image file: ${file.name}\nBase64 data: ${base64}`;
      return { text, type: "image", fileName: file.name };
    }

    if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
      const text = await file.text();
      return { text, type: "text", fileName: file.name };
    }

    // Default to text processing for unknown types
    const text = await file.text();
    return { text, type: "text", fileName: file.name };
  } catch (error) {
    console.error("File processing error:", error);
    throw new Error(
      `Failed to process file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Validate file type and size
 */
export function validateFile(file: File): { isValid: boolean; error?: string } {
  // Check file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    return { isValid: false, error: "File size must be less than 10MB" };
  }

  // Check file type
  const fileName = file.name.toLowerCase();
  const allowedExtensions = [
    ".csv",
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".txt",
    ".md",
  ];

  const hasValidExtension = allowedExtensions.some((ext) =>
    fileName.endsWith(ext)
  );

  if (!hasValidExtension) {
    return {
      isValid: false,
      error:
        "Please select a valid file type (CSV, PDF, JPG, PNG, GIF, BMP, TXT, or MD)",
    };
  }

  return { isValid: true };
}

/**
 * Get file type icon and description
 */
export function getFileTypeInfo(fileName: string): {
  icon: string;
  description: string;
} {
  const fileNameLower = fileName.toLowerCase();

  if (fileNameLower.endsWith(".csv")) {
    return { icon: "📊", description: "CSV Spreadsheet" };
  }

  if (fileNameLower.endsWith(".pdf")) {
    return { icon: "📄", description: "PDF Document" };
  }

  if (fileNameLower.match(/\.(jpg|jpeg|png|gif|bmp)$/i)) {
    return { icon: "🖼️", description: "Image File" };
  }

  if (fileNameLower.endsWith(".txt") || fileNameLower.endsWith(".md")) {
    return { icon: "📝", description: "Text File" };
  }

  return { icon: "📁", description: "Unknown File" };
}
