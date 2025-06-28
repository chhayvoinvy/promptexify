import { Container } from "@/components/ui/container";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <Container className="px-4 py-8">
      <div className="flex flex-col items-center justify-center h-screen gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <p className="text-sm text-muted-foreground mt-2">Loading...</p>
      </div>
    </Container>
  );
}
