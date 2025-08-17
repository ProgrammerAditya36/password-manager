import { Skeleton } from "@/components/ui/skeleton";

export function EmptyStateSkeleton() {
  return (
    <div className="py-12 text-center space-y-4">
      <Skeleton className="h-6 w-32 mx-auto" />
      <Skeleton className="h-5 w-64 mx-auto" />
      <Skeleton className="h-9 w-40 mx-auto" />
    </div>
  );
}
