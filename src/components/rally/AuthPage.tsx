import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { TermsContent, PrivacyContent } from "./LegalContent";

// The Google sign-in redirect can't return to the packaged app, so the app uses email only.
const IS_NATIVE = Capacitor.isNativePlatform();

export function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [legal, setLegal] = useState<null | "terms" | "privacy">(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && !agreed) {
      toast.error("Please agree to the Terms and Privacy Policy to continue.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: IS_NATIVE ? "https://letsrallys.app" : window.location.origin,
            data: { full_name: name.trim() },
          },
        });
        if (error) throw error;
        toast.success("Account created — let's finish setup.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    if (mode === "signup" && !agreed) {
      toast.error("Please agree to the Terms and Privacy Policy to continue.");
      return;
    }
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed.");
    }
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-sm flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-10">
          <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-black text-lg">
            R
          </div>
          <span className="text-xl font-black tracking-tight">Rally</span>
        </div>

        <h1 className="text-[28px] leading-tight font-black tracking-tight">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1.5 text-[14px] text-muted-foreground">
          {mode === "signup"
            ? "Find pickup games near you. Takes a minute."
            : "Sign in to your Rally account."}
        </p>

        {!IS_NATIVE && (
          <>
        <button
          onClick={signInWithGoogle}
          className="mt-8 h-11 w-full rounded-md border border-border bg-card hover:bg-accent flex items-center justify-center gap-2.5 text-[14px] font-semibold transition-colors tap-scale"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            or
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
          </>
        )}

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <Label className="text-[12px] font-semibold">Full name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="mt-1 h-11 rounded-md"
                placeholder="Sam Rivera"
              />
            </div>
          )}
          <div>
            <Label className="text-[12px] font-semibold">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="mt-1 h-11 rounded-md"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <Label className="text-[12px] font-semibold">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              className="mt-1 h-11 rounded-md"
              placeholder="At least 6 characters"
            />
          </div>

          {mode === "signup" && (
            <label className="flex items-start gap-2 pt-1 text-[12px] text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary shrink-0"
              />
              <span>
                I'm 15 or older and I agree to Rally's{" "}
                <button
                  type="button"
                  onClick={() => setLegal("terms")}
                  className="font-semibold text-primary hover:underline"
                >
                  Terms &amp; Conditions
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  onClick={() => setLegal("privacy")}
                  className="font-semibold text-primary hover:underline"
                >
                  Privacy Policy
                </button>
                . I understand games are organized between users at their own
                risk and Rally is not responsible for in-person meetups.
              </span>
            </label>
          )}

          <Button
            type="submit"
            disabled={loading || (mode === "signup" && !agreed)}
            className="w-full h-11 rounded-md text-[14px] font-semibold mt-2"
          >
            {loading
              ? "…"
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-[13px] text-muted-foreground">
          {mode === "signup" ? "Already have an account?" : "New to Rally?"}{" "}
          <button
            onClick={() => setMode(mode === "signup" ? "login" : "signup")}
            className="font-semibold text-primary hover:underline"
          >
            {mode === "signup" ? "Sign in" : "Create one"}
          </button>
        </p>
      </div>

      <Dialog open={legal !== null} onOpenChange={(o) => !o && setLegal(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {legal === "terms" ? "Terms & Conditions" : "Privacy Policy"}
            </DialogTitle>
          </DialogHeader>
          {legal === "terms" ? <TermsContent /> : <PrivacyContent />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6C12.3 13 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.2-3.2-.4-4.7H24v9h12.7c-.5 2.9-2.2 5.4-4.6 7l7.5 5.8C43.9 37.5 46.5 31.5 46.5 24.5z"
      />
      <path
        fill="#FBBC05"
        d="M10.4 28.8c-.5-1.4-.8-3-.8-4.8s.3-3.4.8-4.8L2.6 13.2C.9 16.5 0 20.2 0 24s.9 7.5 2.6 10.8l7.8-6z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2.1 1.4-4.7 2.3-7.7 2.3-6.3 0-11.7-3.5-13.6-9.2l-7.8 6C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}
