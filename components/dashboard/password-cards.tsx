"use client";

import { Password } from "@prisma/client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PasswordCard } from "./password-card";
import { PasswordCardSkeleton } from "./password-card-skeleton";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInfinitePasswords } from "@/lib/hooks/use-passwords";
import { CreatePasswordDialog } from "./create-password-dialog";

interface PasswordCardsProps {
  onEditPassword: (password: Password) => void;
  onDeletePassword: (passwordId: string) => void;
  onSharePassword: (password: Password) => void;
  onViewPassword: (password: Password) => void;
  isSelectionMode: boolean;
  selectedPasswords: Set<string>;
  onTogglePasswordSelection: (passwordId: string) => void;
}

export function PasswordCards({
  onEditPassword,
  onDeletePassword,
  onSharePassword,
  onViewPassword,
  isSelectionMode,
  selectedPasswords,
  onTogglePasswordSelection,
}: PasswordCardsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchQuery = searchParams.get("search") || "";
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const clearSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // TanStack Query hooks
  const {
    data: passwordsData,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfinitePasswords(20, searchQuery);

  // Flatten all pages of passwords into a single array
  const passwords =
    passwordsData?.pages.flatMap((page) => page.passwords) || [];
  const pagination =
    passwordsData?.pages[passwordsData.pages.length - 1]?.pagination;

  // Infinite scroll using Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasNextPage && !isFetchingNextPage) {
          // Add a small delay to prevent rapid successive calls
          setTimeout(() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }, 100);
        }
      },
      {
        threshold: 0.1,
        rootMargin: "200px 0px 0px 0px",
      }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Fallback scroll event listener for infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!hasNextPage || isFetchingNextPage) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Load more when user is near the bottom (within 500px)
      if (scrollTop + windowHeight >= documentHeight - 500) {
        fetchNextPage();
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Reset infinite query when search changes
  useEffect(() => {
    if (passwordsData) {
      refetch();
      // Scroll to top when search changes
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [searchQuery, refetch]);

  // Show loading state for initial load
  if (isLoading && !passwordsData) {
    return (
      <div>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <PasswordCardSkeleton key={index} />
          ))}
        </div>
        <div className="mt-8 text-muted-foreground text-center">
          Loading your passwords...
        </div>
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className="py-12 text-center">
        <h3 className="mb-2 font-medium text-destructive text-lg">
          Failed to load passwords
        </h3>
        <p className="mb-4 text-muted-foreground">
          {error?.message || "An error occurred while loading your passwords"}
        </p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  // Show empty state
  if (passwords.length === 0) {
    return (
      <div className="py-12 text-center">
        <h3 className="mb-2 font-medium text-lg">
          {searchQuery ? "No passwords found" : "No passwords yet"}
        </h3>
        <p className="mb-4 text-muted-foreground">
          {searchQuery
            ? `No passwords match "${searchQuery}". Try a different search term.`
            : "Get started by creating your first password"}
        </p>
        <CreatePasswordDialog />
      </div>
    );
  }

  return (
    <>
      {/* Search results info */}
      {searchQuery && (
        <div className="mb-6 text-center">
          <p className="text-muted-foreground">
            Found {pagination?.total} password
            {pagination?.total !== 1 ? "s" : ""} matching "{searchQuery}"
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={clearSearch}
            className="mt-2"
          >
            Clear Search
          </Button>
        </div>
      )}

      {/* Password cards grid */}
      <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pb-8">
        {passwords.map((password: Password, index: number) => (
          <PasswordCard
            key={password.id}
            password={password}
            onEdit={onEditPassword}
            onDelete={onDeletePassword}
            onShare={onSharePassword}
            onView={onViewPassword}
            isSelected={isSelectionMode && selectedPasswords.has(password.id)}
            onSelectionToggle={() => onTogglePasswordSelection(password.id)}
            showSelection={isSelectionMode}
          />
        ))}
      </div>

      {/* Intersection Observer target for infinite scroll */}
      {hasNextPage && (
        <div
          ref={loadMoreRef}
          className="flex justify-center items-center mt-8 border-t border-border rounded-lg w-full h-20"
        >
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading more passwords...
            </div>
          )}
        </div>
      )}
    </>
  );
}
