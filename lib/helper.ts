import { Password } from "@prisma/client";
import { decrypt } from "./encryption";

// Cache for decrypted passwords to avoid re-decrypting
const decryptionCache = new Map<string, string>();

export const transformPasswordData = async (
  password: Password
): Promise<Password> => {
  // Check cache first
  const cacheKey = `${password.id}-${password.updatedAt.getTime()}`;
  if (decryptionCache.has(cacheKey)) {
    return {
      ...password,
      password: decryptionCache.get(cacheKey)!,
    };
  }

  const decryptedPassword = await decrypt(password.password);

  // Cache the result
  if (decryptedPassword) {
    decryptionCache.set(cacheKey, decryptedPassword);
  }

  return {
    ...password,
    password: decryptedPassword || "",
  };
};

export const transformPasswordDataArray = async (
  passwords: Password[]
): Promise<Password[]> => {
  // Process in batches of 10 for better performance
  const batchSize = 10;
  const results = [];

  for (let i = 0; i < passwords.length; i += batchSize) {
    const batch = passwords.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(transformPasswordData));
    results.push(...batchResults);
  }

  return results;
};

// Clear cache when passwords are updated
export const clearDecryptionCache = (passwordId?: string) => {
  if (passwordId) {
    // Clear specific password cache
    for (const key of decryptionCache.keys()) {
      if (key.startsWith(passwordId)) {
        decryptionCache.delete(key);
      }
    }
  } else {
    // Clear all cache
    decryptionCache.clear();
  }
};
