"use client";

import { useState, useRef, useRef as useReactRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Image,
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { ImportedPassword, ImportProgress } from "@/lib/ai-import";
import { validateFile, getFileTypeInfo } from "@/lib/file-processor";

interface ImportPasswordsDialogProps {
  onImportComplete?: () => void;
}

interface ImportState {
  isImporting: boolean;
  currentChunk: number;
  totalChunks: number;
  currentChunkSize: number;
  totalProcessed: number;
  status: "idle" | "processing" | "saving" | "complete" | "error";
  message: string;
  savingProgress: number;
  savingTotal: number;
  passwords: ImportedPassword[];
}

export function ImportPasswordsDialog({
  onImportComplete,
}: ImportPasswordsDialogProps) {
  const [open, setOpen] = useState(false);
  const [importState, setImportState] = useState<ImportState>({
    isImporting: false,
    currentChunk: 0,
    totalChunks: 0,
    currentChunkSize: 0,
    totalProcessed: 0,
    status: "idle",
    message: "",
    savingProgress: 0,
    savingTotal: 0,
    passwords: [],
  });
  const [showPreview, setShowPreview] = useState(false);
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(
    null
  );
  const [eta, setEta] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Helper to format seconds as mm:ss
  function formatSeconds(seconds: number) {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      toast.error(validation.error || "Invalid file");
      return;
    }

    try {
      // Reset state
      setImportState({
        isImporting: true,
        currentChunk: 0,
        totalChunks: 0,
        currentChunkSize: 0,
        totalProcessed: 0,
        status: "processing",
        message: "Starting import...",
        savingProgress: 0,
        savingTotal: 0,
        passwords: [],
      });
      setProcessingStartTime(Date.now());
      setEta(null);

      // Create FormData
      const formData = new FormData();
      formData.append("file", file);

      // Determine file type
      let fileType = "text";
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        fileType = "csv";
      } else if (
        file.type === "application/pdf" ||
        file.name.endsWith(".pdf")
      ) {
        fileType = "pdf";
      } else if (file.type.startsWith("image/")) {
        fileType = "image";
      }

      formData.append("fileType", fileType);

      // Use fetch with EventSource-like approach for progress
      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
        headers: {
          Accept: "text/event-stream",
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Failed to import file");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const eventData = JSON.parse(line.slice(6));
                handleSSEEvent(eventData);
              } catch (e) {
                console.error("Failed to parse SSE event:", e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error("Import error:", error);
      setImportState((prev) => ({
        ...prev,
        status: "error",
        message: `Import failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        isImporting: false,
      }));
      toast.error(
        `Import failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleSSEEvent = (eventData: any) => {
    switch (eventData.type) {
      case "progress": {
        setImportState((prev) => ({
          ...prev,
          currentChunk: eventData.data.currentChunk,
          totalChunks: eventData.data.totalChunks,
          currentChunkSize: eventData.data.currentChunkSize,
          totalProcessed: eventData.data.totalProcessed,
          status:
            eventData.data.status === "complete" ? "saving" : "processing",
          message: eventData.data.message,
        }));

        // ETA calculation
        if (
          eventData.data.currentChunk > 0 &&
          eventData.data.totalChunks > 0 &&
          processingStartTime
        ) {
          const now = Date.now();
          const elapsedMs = now - processingStartTime;
          const percent =
            eventData.data.currentChunk / eventData.data.totalChunks;
          if (percent > 0) {
            const totalMs = elapsedMs / percent;
            const remainingMs = totalMs - elapsedMs;
            setEta(formatSeconds(remainingMs / 1000));
          }
        }
        break;
      }
      case "processing_complete":
        setImportState((prev) => ({
          ...prev,
          status: "saving",
          message: eventData.data.message,
        }));
        setEta(null);
        break;

      case "saving_progress":
        setImportState((prev) => ({
          ...prev,
          savingProgress: eventData.data.current,
          savingTotal: eventData.data.total,
          message: eventData.data.message,
        }));
        break;

      case "success":
        setImportState((prev) => ({
          ...prev,
          status: "complete",
          message: eventData.data.message,
          passwords: eventData.data.passwords,
          isImporting: false,
        }));
        setShowPreview(true);
        setEta(null);
        toast.success(eventData.data.message);
        break;

      case "error":
        setImportState((prev) => ({
          ...prev,
          status: "error",
          message: eventData.data.message,
          isImporting: false,
        }));
        setEta(null);
        toast.error(eventData.data.message);
        break;
    }
  };

  const handleConfirmImport = async () => {
    try {
      setImportState((prev) => ({
        ...prev,
        isImporting: true,
        message: "Finalizing import...",
      }));

      // The passwords are already saved from the SSE stream
      // We just need to close the dialog and refresh
      setOpen(false);
      setShowPreview(false);
      setImportState({
        isImporting: false,
        currentChunk: 0,
        totalChunks: 0,
        currentChunkSize: 0,
        totalProcessed: 0,
        status: "idle",
        message: "",
        savingProgress: 0,
        savingTotal: 0,
        passwords: [],
      });
      setProcessingStartTime(null);
      setEta(null);

      if (onImportComplete) {
        onImportComplete();
      }

      toast.success("Passwords imported successfully!");
    } catch (error) {
      console.error("Confirm import error:", error);
      toast.error("Failed to confirm import");
    }
  };

  const handleCancel = () => {
    // Close any open EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setOpen(false);
    setShowPreview(false);
    setImportState({
      isImporting: false,
      currentChunk: 0,
      totalChunks: 0,
      currentChunkSize: 0,
      totalProcessed: 0,
      status: "idle",
      message: "",
      savingProgress: 0,
      savingTotal: 0,
      passwords: [],
    });
    setProcessingStartTime(null);
    setEta(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileTypeIcon = (fileName: string) => {
    if (fileName.endsWith(".csv"))
      return <FileSpreadsheet className="w-4 h-4" />;
    if (fileName.endsWith(".pdf")) return <FileText className="w-4 h-4" />;
    if (fileName.match(/\.(jpg|jpeg|png)$/i))
      return <Image className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getProgressPercentage = () => {
    if (importState.status === "saving") {
      return importState.savingTotal > 0
        ? (importState.savingProgress / importState.savingTotal) * 100
        : 0;
    }
    if (importState.totalChunks > 0) {
      return (importState.currentChunk / importState.totalChunks) * 100;
    }
    return 0;
  };

  const getStatusIcon = () => {
    switch (importState.status) {
      case "processing":
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case "saving":
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case "complete":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="w-4 h-4" />
          Import Passwords
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Passwords</DialogTitle>
          <DialogDescription>
            Import passwords from CSV, PDF, image, or text files. The AI will
            automatically extract and format your password data.
          </DialogDescription>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Select File</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  accept=".csv,.pdf,.jpg,.jpeg,.png,.gif,.bmp,.txt,.md"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                  disabled={importState.isImporting}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importState.isImporting}
                >
                  Browse
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                Supported formats: CSV, PDF, JPG, PNG, GIF, BMP, TXT, MD (Max
                10MB)
              </p>
            </div>

            {importState.isImporting && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  {getStatusIcon()}
                  <span className="font-medium">{importState.message}</span>
                </div>

                {importState.status === "processing" &&
                  importState.totalChunks > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-muted-foreground text-xs">
                        <span>
                          {/* Show percentage and ETA instead of chunk numbers */}
                          Processing: {getProgressPercentage().toFixed(0)}%
                          {eta && <span className="ml-2">ETA: {eta}</span>}
                        </span>
                        <span>
                          {importState.totalProcessed} passwords found
                        </span>
                      </div>
                      <Progress
                        value={getProgressPercentage()}
                        className="w-full"
                      />
                    </div>
                  )}

                {importState.status === "saving" && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-muted-foreground text-xs">
                      <span>
                        Saving passwords: {importState.savingProgress}/
                        {importState.savingTotal}
                      </span>
                    </div>
                    <Progress
                      value={getProgressPercentage()}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={importState.isImporting}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Preview ({importState.passwords.length} passwords)</Label>
              <div className="space-y-2 p-2 border rounded-md max-h-60 overflow-y-auto">
                {importState.passwords.map((password, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-muted p-2 rounded"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{password.name}</div>
                      {password.username && (
                        <div className="text-muted-foreground text-sm">
                          Username: {password.username}
                        </div>
                      )}
                      {password.email && (
                        <div className="text-muted-foreground text-sm">
                          Email: {password.email}
                        </div>
                      )}
                      {password.website && (
                        <div className="text-muted-foreground text-sm">
                          Website: {password.website}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={importState.isImporting}
              >
                {importState.isImporting ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Finalizing...
                  </>
                ) : (
                  "Confirm Import"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
