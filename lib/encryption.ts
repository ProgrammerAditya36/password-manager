import { randomBytes, pbkdf2, createCipheriv, createDecipheriv } from "crypto";
import dotenv from "dotenv";

// Load environment variables (this should only run on the server)
dotenv.config();

// --- Constants for Key Derivation (Master Password to Encryption Key) ---
const MASTER_PBKDF2_ITERATIONS = 310000; // Increase for more security, balance with performance
const MASTER_PBKDF2_KEYLEN = 32; // 32 bytes = 256 bits (for AES-256)
const MASTER_PBKDF2_DIGEST = "sha512";
const MASTER_SALT_LENGTH = 16; // Length of the salt for master key derivation

// --- Constants for AES Encryption ---
const AES_ALGORITHM = "aes-256-gcm";
const AES_IV_LENGTH = 16; // 16 bytes for AES IV
const AES_TAG_LENGTH = 16; // 16 bytes for AES-GCM authentication tag

// --- Retrieve Master Password from Environment Variable ---
const MASTER_PASSWORD_ENV = process.env.MASTER_PASSWORD;

if (!MASTER_PASSWORD_ENV) {
  // This is a critical error. The application cannot proceed without the master password.
  // In a real application, you might throw an error, log, and exit.
  console.error(
    "CRITICAL ERROR: MASTER_PASSWORD environment variable is not set."
  );
  // process.exit(1); // Uncomment in production-like environments if it's a hard requirement
}

/**
 * Derives a strong encryption key from a master password using PBKDF2.
 * This key is then used to encrypt/decrypt individual passwords.
 *
 * @param masterPassword The user's master password.
 * @param salt The salt used during key derivation.
 * @returns A Promise resolving to the derived encryption key (Buffer).
 */
async function deriveEncryptionKey(
  masterPassword: string,
  salt: Buffer
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    pbkdf2(
      masterPassword,
      salt,
      MASTER_PBKDF2_ITERATIONS,
      MASTER_PBKDF2_KEYLEN,
      MASTER_PBKDF2_DIGEST,
      (err, derivedKey) => {
        if (err) {
          return reject(err);
        }
        resolve(derivedKey);
      }
    );
  });
}

export async function encrypt(plainTextPassword: string): Promise<string> {
  if (!MASTER_PASSWORD_ENV) {
    throw new Error("Master password not set in environment.");
  }

  // Generate a new salt for deriving the key for *this encryption operation*.
  const salt = randomBytes(MASTER_SALT_LENGTH);
  const encryptionKey = await deriveEncryptionKey(MASTER_PASSWORD_ENV, salt);

  const iv = randomBytes(AES_IV_LENGTH); // Initialization Vector for AES
  const cipher = createCipheriv(AES_ALGORITHM, encryptionKey, iv);

  let encrypted = cipher.update(plainTextPassword, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag(); // Get the authentication tag for GCM

  return `${salt.toString("hex")}:${iv.toString(
    "hex"
  )}:${encrypted}:${authTag.toString("hex")}`;
}

/**
 * Decrypts a password string using AES-256-GCM
 * using the master password from environment variables.
 *
 * @param encryptedString The encrypted password string in "saltHex:ivHex:cipherTextHex:authTagHex" format.
 * @returns A Promise resolving to the decrypted plain-text password, or null if decryption fails.
 */
export async function decrypt(encryptedString: string): Promise<string | null> {
  if (!MASTER_PASSWORD_ENV) {
    throw new Error("Master password not set in environment.");
  }

  try {
    const parts = encryptedString.split(":");
    if (parts.length !== 4) {
      console.error("Invalid encrypted string format.");
      return null;
    }

    const salt = Buffer.from(parts[0], "hex");
    const iv = Buffer.from(parts[1], "hex");
    const encryptedText = parts[2];
    const authTag = Buffer.from(parts[3], "hex");

    // Re-derive the encryption key using the stored salt and master password from env
    const encryptionKey = await deriveEncryptionKey(MASTER_PASSWORD_ENV, salt);

    const decipher = createDecipheriv(AES_ALGORITHM, encryptionKey, iv);
    decipher.setAuthTag(authTag); // Set the authentication tag for GCM verification

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    // This typically catches authentication tag mismatches (tampering) or incorrect keys
    console.error(
      "Decryption failed, likely incorrect master password from ENV or data tampering:",
      error
    );
    return null;
  }
}
