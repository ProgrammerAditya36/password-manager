import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { importPasswords, ImportProgress } from "@/lib/ai-import";

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Check if client wants SSE
  const acceptHeader = request.headers.get("accept");
  const wantsSSE = acceptHeader?.includes("text/event-stream");

  if (wantsSSE) {
    return handleSSEImport(request, userId);
  }

  return handleRegularImport(request, userId);
}

async function handleRegularImport(request: NextRequest, userId: string) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileType = formData.get("fileType") as string;

    if (!file) {
      return new NextResponse("No file provided", { status: 400 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Read file content
    let fileContent: string;
    let detectedType: "csv" | "text" | "image" | "pdf";

    // Determine file type
    if (fileType === "csv" || file.name.endsWith(".csv")) {
      detectedType = "csv";
      fileContent = await file.text();
    } else if (fileType === "pdf" || file.name.endsWith(".pdf")) {
      detectedType = "pdf";
      // For PDFs, we'll need to extract text - for now, convert to text
      fileContent = await file.text();
    } else if (
      fileType === "image" ||
      file.name.endsWith(".jpg") ||
      file.name.endsWith(".jpeg") ||
      file.name.endsWith(".png")
    ) {
      detectedType = "image";
      // For images, we'll need OCR - for now, convert to base64 and send as text
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      fileContent = `Image data: ${base64}`;
    } else {
      detectedType = "text";
      fileContent = await file.text();
    }

    // Process the file content
    const importResult = await importPasswords(fileContent, detectedType);

    if (importResult.passwords.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No passwords found in the file",
        result: importResult,
      });
    }

    // Encrypt and save passwords
    const savedPasswords = [];
    const errors = [];

    for (const passwordData of importResult.passwords) {
      try {
        const encryptedPassword = await encrypt(passwordData.password);

        const savedPassword = await prisma.password.create({
          data: {
            name: passwordData.name,
            username: passwordData.username,
            email: passwordData.email,
            password: encryptedPassword,
            website: passwordData.website,
            description: passwordData.description,
            userId: user.id,
          },
        });

        savedPasswords.push(savedPassword);
      } catch (error) {
        errors.push(
          `Failed to save password "${passwordData.name}": ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${savedPasswords.length} passwords`,
      result: {
        ...importResult,
        savedCount: savedPasswords.length,
        errors: errors.length > 0 ? errors : undefined,
      },
      passwords: savedPasswords.map((p) => ({
        id: p.id,
        name: p.name,
        username: p.username,
        email: p.email,
        website: p.website,
        description: p.description,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error("[API_IMPORT_POST]", error);
    return new NextResponse(
      `Internal Error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      { status: 500 }
    );
  }
}

async function handleSSEImport(request: NextRequest, userId: string) {
  const encoder = new TextEncoder();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileType = formData.get("fileType") as string;

    if (!file) {
      return new NextResponse("No file provided", { status: 400 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Read file content
    let fileContent: string;
    let detectedType: "csv" | "text" | "image" | "pdf";

    // Determine file type
    if (fileType === "csv" || file.name.endsWith(".csv")) {
      detectedType = "csv";
      fileContent = await file.text();
    } else if (fileType === "pdf" || file.name.endsWith(".pdf")) {
      detectedType = "pdf";
      fileContent = await file.text();
    } else if (
      fileType === "image" ||
      file.name.endsWith(".jpg") ||
      file.name.endsWith(".jpeg") ||
      file.name.endsWith(".png")
    ) {
      detectedType = "image";
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      fileContent = `Image data: ${base64}`;
    } else {
      detectedType = "text";
      fileContent = await file.text();
    }

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial progress
          const initialProgress = {
            type: "progress",
            data: {
              currentChunk: 0,
              totalChunks: 0,
              currentChunkSize: 0,
              totalProcessed: 0,
              status: "processing" as const,
              message: "Starting file processing...",
            },
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(initialProgress)}\n\n`)
          );

          // Process the file content with progress updates
          const importResult = await importPasswords(
            fileContent,
            detectedType,
            (progress: ImportProgress) => {
              const progressEvent = {
                type: "progress",
                data: progress,
              };

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(progressEvent)}\n\n`)
              );
            }
          );

          if (importResult.passwords.length === 0) {
            const errorEvent = {
              type: "error",
              data: {
                message: "No passwords found in the file",
                result: importResult,
              },
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`)
            );
            controller.close();
            return;
          }

          // Send processing complete event
          const completeEvent = {
            type: "processing_complete",
            data: {
              message: "AI processing complete, saving passwords...",
              result: importResult,
            },
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(completeEvent)}\n\n`)
          );

          // Encrypt and save passwords
          const savedPasswords = [];
          const errors = [];

          for (let i = 0; i < importResult.passwords.length; i++) {
            const passwordData = importResult.passwords[i];

            try {
              const encryptedPassword = await encrypt(passwordData.password);

              const savedPassword = await prisma.password.create({
                data: {
                  name: passwordData.name,
                  username: passwordData.username,
                  email: passwordData.email,
                  password: encryptedPassword,
                  website: passwordData.website,
                  description: passwordData.description,
                  userId: user.id,
                },
              });

              savedPasswords.push(savedPassword);

              // Send saving progress
              const savingProgress = {
                type: "saving_progress",
                data: {
                  current: i + 1,
                  total: importResult.passwords.length,
                  message: `Saving password ${i + 1}/${
                    importResult.passwords.length
                  }`,
                },
              };

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(savingProgress)}\n\n`)
              );
            } catch (error) {
              errors.push(
                `Failed to save password "${passwordData.name}": ${
                  error instanceof Error ? error.message : "Unknown error"
                }`
              );
            }
          }

          // Send final success event
          const successEvent = {
            type: "success",
            data: {
              message: `Successfully imported ${savedPasswords.length} passwords`,
              result: {
                ...importResult,
                savedCount: savedPasswords.length,
                errors: errors.length > 0 ? errors : undefined,
              },
              passwords: savedPasswords.map((p) => ({
                id: p.id,
                name: p.name,
                username: p.username,
                email: p.email,
                website: p.website,
                description: p.description,
                createdAt: p.createdAt,
              })),
            },
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(successEvent)}\n\n`)
          );

          controller.close();
        } catch (error) {
          console.error("[API_IMPORT_SSE]", error);

          const errorEvent = {
            type: "error",
            data: {
              message: `Import failed: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            },
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`)
          );

          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[API_IMPORT_SSE]", error);

    const errorEvent = {
      type: "error",
      data: {
        message: `Failed to start import: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
    };

    return new Response(`data: ${JSON.stringify(errorEvent)}\n\n`, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  }
}
