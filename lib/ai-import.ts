import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import dotenv from "dotenv";
dotenv.config();

console.log("🔑 Initializing Google Generative AI...");
console.log("API Key present:", !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

export interface ImportedPassword {
  name: string;
  username?: string;
  email?: string;
  password: string;
  website?: string;
  description?: string;
}

export interface ImportResult {
  passwords: ImportedPassword[];
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  errors: string[];
}

export interface ImportProgress {
  currentChunk: number;
  totalChunks: number;
  currentChunkSize: number;
  totalProcessed: number;
  status: "processing" | "complete" | "error";
  message: string;
}

/**
 * Helper to split large text into chunks that fit within model context window.
 * This is a naive splitter by line count, but can be improved for tokens.
 */
function splitTextIntoChunks(
  text: string,
  maxChunkSize: number = 6000
): string[] {
  console.log(
    `📄 Splitting text into chunks. Total length: ${text.length} chars, max chunk size: ${maxChunkSize}`
  );

  // Try to split by lines, but keep each chunk under maxChunkSize characters
  const lines = text.split("\n");
  console.log(`📝 Total lines: ${lines.length}`);

  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const line of lines) {
    // +1 for newline
    if (
      currentLength + line.length + 1 > maxChunkSize &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk.join("\n"));
      console.log(
        `✂️ Created chunk ${chunks.length}: ${currentLength} chars, ${currentChunk.length} lines`
      );
      currentChunk = [];
      currentLength = 0;
    }
    currentChunk.push(line);
    currentLength += line.length + 1;
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join("\n"));
    console.log(
      `✂️ Created final chunk ${chunks.length}: ${currentLength} chars, ${currentChunk.length} lines`
    );
  }

  console.log(`✅ Text split into ${chunks.length} chunks`);
  return chunks;
}

/**
 * Process text content using AI to extract password information (streaming, chunked for big inputs)
 */
export async function processContentWithAI(
  content: string,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportedPassword[]> {
  console.log(
    `🤖 Starting AI processing for content of ${content.length} characters`
  );

  try {
    // If content is very large, split into chunks and process each
    const maxChunkSize = 6000; // chars, adjust as needed for model context
    const chunks = splitTextIntoChunks(content, maxChunkSize);

    let allPasswords: ImportedPassword[] = [];
    console.log(`🔄 Processing ${chunks.length} chunks with AI...`);

    // Emit initial progress
    onProgress?.({
      currentChunk: 0,
      totalChunks: chunks.length,
      currentChunkSize: 0,
      totalProcessed: 0,
      status: "processing",
      message: `Starting AI processing of ${chunks.length} chunks...`,
    });

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk) {
        console.log(`⚠️ Skipping undefined chunk ${i + 1}`);
        continue;
      }

      console.log(
        `\n📤 Sending chunk ${i + 1}/${chunks.length} to AI (${
          chunk.length
        } chars)`
      );

      // Emit chunk progress
      onProgress?.({
        currentChunk: i + 1,
        totalChunks: chunks.length,
        currentChunkSize: chunk.length,
        totalProcessed: allPasswords.length,
        status: "processing",
        message: `Processing chunk ${i + 1}/${chunks.length} (${
          chunk.length
        } chars)...`,
      });

      const stream = streamText({
        model: google("gemini-2.0-flash-lite"),
        prompt: `You are a password data extraction expert. Analyze the following content and extract password entries in a structured format.

Content to analyze (chunk ${i + 1} of ${chunks.length}):
${chunk}

Please extract password information and return ONLY a valid JSON array with the following structure:
[
  {
    "name": "Service/Website Name",
    "username": "username or login",
    "email": "email address if present",
    "password": "password",
    "website": "website URL if present",
    "description": "any additional notes or description"
  }
]

Rules:
1. Only return valid JSON, no other text
2. If a field is not present, omit it or set to null
3. Ensure all passwords are properly extracted
4. Handle various formats like "username:password", "login/password", etc.
5. If the content doesn't contain password data, return an empty array []
6. Be smart about detecting service names from context

Return only the JSON array:`,
      });

      let aiResponse = "";
      console.log(`⏳ Receiving AI response for chunk ${i + 1}...`);

      for await (const delta of stream.textStream) {
        aiResponse += delta;
        // Optionally, you can log the streamed chunks:
        // process.stdout.write(delta);
      }
      aiResponse = aiResponse.trim();
      console.log(
        `📥 AI response for chunk ${i + 1} received (${
          aiResponse.length
        } chars)`
      );
      console.log(
        `🔍 AI response preview: ${aiResponse.substring(0, 200)}${
          aiResponse.length > 200 ? "..." : ""
        }`
      );

      // Try to extract JSON from the response
      let jsonStart = aiResponse.indexOf("[");
      let jsonEnd = aiResponse.lastIndexOf("]") + 1;

      if (jsonStart === -1 || jsonEnd === 0) {
        console.log(`⚠️ No JSON array found in chunk ${i + 1}, skipping`);
        continue;
      }

      const jsonString = aiResponse.substring(jsonStart, jsonEnd);
      console.log(`🔧 Extracted JSON string (${jsonString.length} chars)`);

      let parsedData: any;
      try {
        parsedData = JSON.parse(jsonString);
        console.log(`✅ JSON parsed successfully for chunk ${i + 1}`);
      } catch (e) {
        console.error(`❌ Failed to parse AI JSON for chunk ${i + 1}:`, e);
        console.error(`🔍 Problematic JSON string:`, jsonString);
        continue;
      }

      if (!Array.isArray(parsedData)) {
        console.log(
          `⚠️ Parsed data is not an array for chunk ${i + 1}, skipping`
        );
        continue;
      }

      console.log(
        `📊 Raw AI data for chunk ${i + 1}: ${parsedData.length} items`
      );

      // Validate and clean the data
      const validatedPasswords: ImportedPassword[] = parsedData
        .filter((item: any) => item && typeof item === "object")
        .map((item: any) => ({
          name: item.name || "Unknown Service",
          username: item.username || undefined,
          email: item.email || undefined,
          password: item.password || "",
          website: item.website || undefined,
          description: item.description || undefined,
        }))
        .filter((item: ImportedPassword) => item.password && item.name);

      console.log(
        `✅ Validated passwords from chunk ${i + 1}: ${
          validatedPasswords.length
        } items`
      );

      allPasswords = allPasswords.concat(validatedPasswords);
      console.log(`📈 Total passwords so far: ${allPasswords.length}`);

      // Emit progress after each chunk
      onProgress?.({
        currentChunk: i + 1,
        totalChunks: chunks.length,
        currentChunkSize: chunk.length,
        totalProcessed: allPasswords.length,
        status: "processing",
        message: `Completed chunk ${i + 1}/${
          chunks.length
        }. Total passwords found: ${allPasswords.length}`,
      });
    }

    // Emit completion progress
    onProgress?.({
      currentChunk: chunks.length,
      totalChunks: chunks.length,
      currentChunkSize: 0,
      totalProcessed: allPasswords.length,
      status: "complete",
      message: `AI processing complete. Total passwords extracted: ${allPasswords.length}`,
    });

    console.log(
      `🎉 AI processing complete. Total passwords extracted: ${allPasswords.length}`
    );
    return allPasswords;
  } catch (error) {
    console.error("💥 AI processing error:", error);

    // Emit error progress
    onProgress?.({
      currentChunk: 0,
      totalChunks: 0,
      currentChunkSize: 0,
      totalProcessed: 0,
      status: "error",
      message: `AI processing failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    });

    throw new Error(
      `Failed to process content with AI: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Process CSV content and convert to password objects
 */
export function processCSVContent(csvContent: string): ImportedPassword[] {
  console.log(
    `📊 Starting CSV processing for content of ${csvContent.length} characters`
  );

  try {
    const lines = csvContent.trim().split("\n");
    console.log(`📝 CSV has ${lines.length} lines`);

    if (!lines || lines.length === 0) {
      throw new Error("CSV is empty");
    }
    if (lines.length < 2) {
      throw new Error("CSV must have at least a header row and one data row");
    }

    const headers = lines[0]?.split(",").map((h) => h.trim().replace(/"/g, ""));
    console.log(`📋 CSV headers:`, headers);

    const passwords: ImportedPassword[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.trim()) {
        console.log(`⏭️ Skipping empty line ${i + 1}`);
        continue;
      }

      console.log(
        `🔍 Processing line ${i + 1}: ${line.substring(0, 100)}${
          line.length > 100 ? "..." : ""
        }`
      );

      // Simple CSV parsing (handles quoted fields)
      const values: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j] || "";
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      console.log(`🔧 Parsed values:`, values);

      // Map values to headers
      const row: any = {};
      headers?.forEach((header, index) => {
        if (values[index]) {
          row[header.toLowerCase()] = values[index].replace(/"/g, "");
        }
      });

      console.log(`📋 Mapped row data:`, row);

      // Convert to ImportedPassword format
      const password: ImportedPassword = {
        name: row.name || row.service || row.title || "Unknown Service",
        username: row.username || row.login || row.user || undefined,
        email: row.email || undefined,
        password: row.password || row.pass || "",
        website: row.website || row.url || row.site || undefined,
        description: row.description || row.note || row.notes || undefined,
      };

      console.log(`🔐 Created password object:`, {
        name: password.name,
        username: password.username,
        email: password.email,
        password: password.password ? "***" : "missing",
        website: password.website,
        description: password.description,
      });

      if (password.password && password.name) {
        passwords.push(password);
        console.log(`✅ Added valid password from line ${i + 1}`);
      } else {
        console.log(
          `⚠️ Skipping invalid password from line ${
            i + 1
          } (missing password or name)`
        );
      }
    }

    console.log(
      `🎉 CSV processing complete. Total passwords: ${passwords.length}`
    );
    return passwords;
  } catch (error) {
    console.error("💥 CSV processing error:", error);
    throw new Error(
      `Failed to process CSV: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Main import function that handles different file types
 */
export async function importPasswords(
  fileContent: string,
  fileType: "csv" | "text" | "image" | "pdf",
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  console.log(
    `🚀 Starting password import for ${fileType} file (${fileContent.length} characters)`
  );

  const result: ImportResult = {
    passwords: [],
    totalProcessed: 0,
    successCount: 0,
    errorCount: 0,
    errors: [],
  };

  try {
    let passwords: ImportedPassword[] = [];

    switch (fileType) {
      case "csv":
        console.log(`📊 Processing as CSV file`);
        // For CSV, try direct parsing first, then AI if needed
        try {
          console.log(`🤖 Attempting AI processing for CSV...`);
          passwords = await processContentWithAI(fileContent, onProgress);
          console.log(`✅ AI processing successful for CSV`);
          //   passwords = processCSVContent(fileContent);
        } catch (e) {
          console.log(
            `⚠️ AI processing failed for CSV, falling back to direct parsing`
          );
          console.error(`Fallback error:`, e);
          // Fallback to AI processing if CSV parsing fails
        }
        break;

      case "text":
        console.log(`📝 Processing as text file`);
        // Use AI for these types
        passwords = await processContentWithAI(fileContent, onProgress);
        break;

      case "image":
        console.log(`🖼️ Processing as image file`);
        // Use AI for these types
        passwords = await processContentWithAI(fileContent, onProgress);
        break;

      case "pdf":
        console.log(`📄 Processing as PDF file`);
        // Use AI for these types
        passwords = await processContentWithAI(fileContent, onProgress);
        break;

      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    result.passwords = passwords;
    result.totalProcessed = passwords.length;
    result.successCount = passwords.length;

    console.log(`📊 Import results:`, {
      totalProcessed: result.totalProcessed,
      successCount: result.successCount,
      errorCount: result.errorCount,
      passwordCount: passwords.length,
    });
  } catch (error) {
    console.error(`💥 Import error:`, error);
    result.errorCount = 1;
    result.errors.push(
      error instanceof Error ? error.message : "Unknown error occurred"
    );
  }

  console.log(`🏁 Import process complete`);
  return result;
}
