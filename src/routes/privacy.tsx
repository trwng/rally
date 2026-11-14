import { createFileRoute, Link } from "@tanstack/react-router";
import { PrivacyContent } from "@/components/rally/LegalContent";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Rally" },
      { name: "description", content: "Rally privacy policy." },
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
      <h1 className="mt-4 mb-4 text-[26px] font-black tracking-tight">Privacy Policy</h1>
      <PrivacyContent />
    </div>
  );
}
