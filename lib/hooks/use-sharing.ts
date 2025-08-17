import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShareableLink, Password } from "@prisma/client";

interface ShareableLinkWithDetails extends ShareableLink {
  password?: {
    id: string;
    name: string;
    website?: string;
  };
}

interface ShareableLinksResponse {
  shareableLinks: ShareableLinkWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface CreateShareLinkData {
  passwordId: string;
  expiresAt?: string;
}

interface SharedContentResponse {
  id: string;
  createdAt: string;
  expiresAt?: string;
  sharedBy?: string;
  password: Password;
}

interface ImportedContentResponse {
  passwords?: Array<{
    id: string;
    importedAt: string;
    password: Password & {
      user: { email?: string };
    };
  }>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Query keys for caching
export const sharingKeys = {
  all: ["sharing"] as const,
  links: () => [...sharingKeys.all, "links"] as const,
  linksList: (filters: { page?: number; limit?: number }) =>
    [...sharingKeys.links(), filters] as const,
  sharedContent: () => [...sharingKeys.all, "shared"] as const,
  sharedContentByToken: (token: string) =>
    [...sharingKeys.sharedContent(), token] as const,
  imported: () => [...sharingKeys.all, "imported"] as const,
  importedList: (filters: { page?: number; limit?: number }) =>
    [...sharingKeys.imported(), filters] as const,
};

// Fetch shareable links
const fetchShareableLinks = async (
  page: number = 1,
  limit: number = 20
): Promise<ShareableLinksResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  const response = await fetch(`/api/share?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch shareable links");
  }
  return response.json();
};

// Create shareable link
const createShareableLink = async (
  data: CreateShareLinkData
): Promise<ShareableLinkWithDetails> => {
  const response = await fetch("/api/share", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to create shareable link");
  }

  return response.json();
};

// Fetch shared content by token (public)
const fetchSharedContent = async (
  token: string
): Promise<SharedContentResponse> => {
  const response = await fetch(`/api/share/${token}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Shared link not found or expired");
    }
    if (response.status === 410) {
      throw new Error("Shared link has expired");
    }
    throw new Error("Failed to fetch shared content");
  }
  return response.json();
};

// Import shared content
const importSharedContent = async (token: string): Promise<any> => {
  const response = await fetch(`/api/share/${token}`, {
    method: "POST",
  });

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error("Content already imported");
    }
    if (response.status === 404) {
      throw new Error("Shared link not found or expired");
    }
    if (response.status === 410) {
      throw new Error("Shared link has expired");
    }
    throw new Error("Failed to import shared content");
  }

  return response.json();
};

// Deactivate shareable link
const deactivateShareableLink = async (
  token: string
): Promise<ShareableLinkWithDetails> => {
  const response = await fetch(`/api/share/${token}/deactivate`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to deactivate shareable link");
  }

  return response.json();
};

// Fetch imported content
const fetchImportedContent = async (
  page: number = 1,
  limit: number = 20
): Promise<ImportedContentResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  const response = await fetch(`/api/imported?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch imported content");
  }
  return response.json();
};

// Hook for fetching shareable links
export const useShareableLinks = (page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: sharingKeys.linksList({ page, limit }),
    queryFn: () => fetchShareableLinks(page, limit),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

// Hook for creating shareable links
export const useCreateShareableLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createShareableLink,
    onSuccess: () => {
      // Invalidate and refetch shareable links
      queryClient.invalidateQueries({ queryKey: sharingKeys.links() });
    },
    onError: (error) => {
      console.error("Failed to create shareable link:", error);
    },
  });
};

// Hook for fetching shared content by token
export const useSharedContent = (token: string) => {
  return useQuery({
    queryKey: sharingKeys.sharedContentByToken(token),
    queryFn: () => fetchSharedContent(token),
    enabled: !!token,
    retry: false, // Don't retry on error since it might be expired/invalid
  });
};

// Hook for importing shared content
export const useImportSharedContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importSharedContent,
    onSuccess: () => {
      // Invalidate imported content and passwords lists
      queryClient.invalidateQueries({ queryKey: sharingKeys.imported() });
      queryClient.invalidateQueries({ queryKey: ["passwords"] });
    },
    onError: (error) => {
      console.error("Failed to import shared content:", error);
    },
  });
};

// Hook for deactivating shareable links
export const useDeactivateShareableLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivateShareableLink,
    onSuccess: () => {
      // Invalidate and refetch shareable links
      queryClient.invalidateQueries({ queryKey: sharingKeys.links() });
    },
    onError: (error) => {
      console.error("Failed to deactivate shareable link:", error);
    },
  });
};

// Hook for fetching imported content
export const useImportedContent = (page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: sharingKeys.importedList({ page, limit }),
    queryFn: () => fetchImportedContent(page, limit),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};
