import { Suspense } from "react";
import { PageSkeleton } from "@/components/Skeleton";
import WorkoutRunner from "./WorkoutRunner";

// The workout id is only known at request time, so the client runner sits inside Suspense.
export default function WorkoutPage() {
  return (
    <Suspense fallback={<PageSkeleton cards={1} />}>
      <WorkoutRunner />
    </Suspense>
  );
}
