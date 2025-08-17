import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { Password } from "@prisma/client";

interface PasswordWithGroup extends Password {
  passwordGroup?: {
    id: string;
    name: string;
  };
}

interface PasswordsResponse {
  passwords: PasswordWithGroup[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface CreatePasswordData {
  name: string;
  username?: string;
  email?: string;
  password: string;
  website?: string;
  description?: string;
  passwordGroupId?: string | null;
}

interface UpdatePasswordData extends Partial<CreatePasswordData> {
  id: string;
}

// Query keys for caching
export const passwordKeys = {
  all: ["passwords"] as const,
  lists: () => [...passwordKeys.all, "list"] as const,
  list: (filters: {
    page?: number;
    limit?: number;
    search?: string;
    groupId?: string;
  }) => [...passwordKeys.lists(), filters] as const,
  details: () => [...passwordKeys.all, "detail"] as const,
  detail: (id: string) => [...passwordKeys.details(), id] as const,
  infinite: (filters: { limit?: number; search?: string; groupId?: string }) =>
    [...passwordKeys.lists(), "infinite", filters] as const,
};

// Fetch passwords with pagination and filters
const fetchPasswords = async (
  page: number = 1,
  limit: number = 20,
  search?: string,
  groupId?: string
): Promise<PasswordsResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (search) params.append("search", search);
  if (groupId) params.append("groupId", groupId);

  const response = await fetch(`/api/passwords?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch passwords");
  }

  return response.json();
};

// Create password
const createPassword = async (data: CreatePasswordData): Promise<Password> => {
  const response = await fetch("/api/passwords", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to create password");
  }

  return response.json();
};

// Update password
const updatePassword = async (data: UpdatePasswordData): Promise<Password> => {
  const response = await fetch(`/api/passwords/${data.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to update password");
  }

  return response.json();
};

// Delete password
const deletePassword = async (id: string): Promise<void> => {
  const response = await fetch(`/api/passwords/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete password");
  }
};

// Fetch all passwords for export (no pagination)
const fetchAllPasswords = async (): Promise<PasswordWithGroup[]> => {
  // Use a reasonable limit for export - in production you might want to implement
  // server-side streaming for very large datasets
  const response = await fetch("/api/passwords?limit=1000");
  if (!response.ok) {
    throw new Error("Failed to fetch all passwords");
  }
  const data = await response.json();
  return data.passwords;
};

// Hook for fetching passwords
export const usePasswords = (
  page: number = 1,
  limit: number = 20,
  search?: string,
  groupId?: string
) => {
  return useQuery({
    queryKey: passwordKeys.list({ page, limit, search, groupId }),
    queryFn: () => fetchPasswords(page, limit, search, groupId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

// Hook for infinite query of passwords
export const useInfinitePasswords = (
  limit: number = 20,
  search?: string,
  groupId?: string
) => {
  return useInfiniteQuery({
    queryKey: passwordKeys.infinite({ limit, search, groupId }),
    queryFn: ({ pageParam = 1 }) =>
      fetchPasswords(pageParam, limit, search, groupId),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasNext) {
        const nextPage = lastPage.pagination.page + 1;
        return nextPage;
      }
      return undefined;
    },
    getPreviousPageParam: (firstPage) => {
      if (firstPage.pagination.hasPrev) {
        return firstPage.pagination.page - 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

// Hook for creating passwords
export const useCreatePassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPassword,
    onSuccess: () => {
      // Invalidate and refetch passwords list
      queryClient.invalidateQueries({ queryKey: passwordKeys.lists() });
      // Also invalidate infinite queries
      queryClient.invalidateQueries({ queryKey: passwordKeys.lists() });
    },
    onError: (error) => {
      console.error("Failed to create password:", error);
    },
  });
};

// Hook for updating passwords
export const useUpdatePassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePassword,
    onSuccess: (updatedPassword) => {
      // Update the specific password in cache
      queryClient.setQueryData(
        passwordKeys.detail(updatedPassword.id),
        updatedPassword
      );
      // Invalidate and refetch passwords list
      queryClient.invalidateQueries({ queryKey: passwordKeys.lists() });
      // Also invalidate infinite queries
      queryClient.invalidateQueries({ queryKey: passwordKeys.lists() });
    },
    onError: (error) => {
      console.error("Failed to update password:", error);
    },
  });
};

// Hook for deleting passwords
export const useDeletePassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePassword,
    onSuccess: (_, deletedId) => {
      // Remove the deleted password from cache
      queryClient.removeQueries({ queryKey: passwordKeys.detail(deletedId) });
      // Invalidate and refetch passwords list
      queryClient.invalidateQueries({ queryKey: passwordKeys.lists() });
      // Also invalidate infinite queries
      queryClient.invalidateQueries({ queryKey: passwordKeys.lists() });
    },
    onError: (error) => {
      console.error("Failed to delete password:", error);
    },
  });
};

// Hook for refreshing passwords
export const useRefreshPasswords = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => fetchPasswords(1, 20), // Default to first page
    onSuccess: (data) => {
      // Update the first page cache
      queryClient.setQueryData(passwordKeys.list({ page: 1, limit: 20 }), data);
      // Also invalidate infinite queries to refresh all data
      queryClient.invalidateQueries({ queryKey: passwordKeys.lists() });
    },
    onError: (error) => {
      console.error("Failed to refresh passwords:", error);
    },
  });
};

// Hook for fetching all passwords (for export)
export const useAllPasswords = () => {
  return useQuery({
    queryKey: [...passwordKeys.lists(), "all"],
    queryFn: fetchAllPasswords,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
};
