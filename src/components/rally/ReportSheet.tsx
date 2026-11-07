import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRally } from "@/lib/rally-store";
import type { ReportReason, ReportTarget } from "@/lib/rally-api";
import { toast } from "sonner";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "harassment", label: "Harassment or bullying" },
  { value: "hate_speech", label: "Hate speech" },
  { value: "spam", label: "Spam or scam" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "safety", label: "Safety concern" },
  { value: "impersonation", label: "Impersonation" },
  { value: "other", label: "Something else" },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  targetType: ReportTarget;
  targetId: string;
  targetLabel?: string;
}

export function ReportSheet({ open, onOpenChange, targetType, targetId, targetLabel }: Props) {
  const { reportItem } = useRally();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reason) {
      toast.error("Pick a reason");
      return;
    }
    setSubmitting(true);
    try {
      await reportItem({ targetType, targetId, reason, details: details.trim() || undefined });
      toast.success("Report submitted. Thank you.");
      setReason(null);
      setDetails("");
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't submit report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Report {targetType}</DialogTitle>
          <DialogDescription>
            {targetLabel ? `Reporting: ${targetLabel}` : "Reports are reviewed by our team."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {REASONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setReason(r.value)}
              className={`w-full text-left px-3 py-2 rounded-md border text-sm tap-scale ${
                reason === r.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/40"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <Textarea
          placeholder="Add details (optional)"
          value={details}
          onChange={(e) => setDetails(e.target.value.slice(0, 500))}
          rows={3}
        />
        <Button onClick={submit} disabled={!reason || submitting} className="w-full">
          {submitting ? "Submitting…" : "Submit report"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
