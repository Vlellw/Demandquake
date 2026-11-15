import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isNetworkReadFailure } from "@/lib/query-recovery";

export function PageError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [retrying, setRetrying] = useState(false);
  async function retry() {
    setRetrying(true);
    try {
      queryClient.resetQueries({ predicate: (query) => query.state.status === "error" });
      await router.invalidate({ sync: true });
      reset();
    } finally {
      setRetrying(false);
    }
  }
  return (
    <section role="alert" className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="section-title text-3xl">This page couldn’t load</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {isNetworkReadFailure(error) ? "The connection was interrupted. Your saved research is unchanged." : "We couldn’t retrieve this page. Please try again."}
      </p>
      <Button className="mt-6" onClick={retry} disabled={retrying}>
        {retrying ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
        {retrying ? "Reconnecting…" : "Try again"}
      </Button>
    </section>
  );
}