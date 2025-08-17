import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function PasswordCardSkeleton() {
  return (
    <Card className="animate-in duration-300 fade-in-0">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 space-y-2">
            <Skeleton className="w-3/4 h-5" />
            <Skeleton className="w-1/2 h-4" />
          </div>
          <Skeleton className="rounded-full w-8 h-8" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="w-20 h-4" />
            <Skeleton className="w-16 h-4" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-12 h-4" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Skeleton className="w-16 h-8" />
            <Skeleton className="w-16 h-8" />
            <Skeleton className="w-16 h-8" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
