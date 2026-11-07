import { lazy, Suspense, useEffect, useState, type ComponentProps } from "react";

const LazyMap = lazy(() => import("./MapViewImpl"));

type MapViewProps = ComponentProps<typeof LazyMap>;

export function MapView(props: MapViewProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div
        className={
          props.square
            ? "w-full h-64 bg-muted animate-pulse"
            : "w-full h-48 bg-muted animate-pulse rounded-lg"
        }
      />
    );
  }
  return (
    <Suspense fallback={<div className="w-full h-48 bg-muted animate-pulse" />}>
      <LazyMap {...props} />
    </Suspense>
  );
}
