import { createFileRoute, Link } from "@tanstack/react-router";
import { TermsContent } from "@/components/rally/LegalContent";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Rally" },
      { name: "description", content: "Rally terms & conditions." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-md min-h-dvh bg-background px-5 py-8">
      <Link to="/" className="text-[13px] font-semibold text-primary hover:underline">
        ← Back to Rally
      </Link>
      <h1 className="mt-4 mb-4 text-[26px] font-black tracking-tight">Terms &amp; Conditions</h1>
      <TermsContent />
    </div>
  );
}
