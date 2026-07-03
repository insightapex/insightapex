"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, signIn, signOut } from "next-auth/react";

export type LoginStatus = "idle" | "signing-in" | "redirecting";

type UseLoginOptions = {
  adminOnly?: boolean;
};

function getRedirectPath(role: string | undefined, adminOnly: boolean): string | null {
  if (adminOnly) {
    return role === "ADMIN" ? "/admin" : null;
  }
  return role === "ADMIN" ? "/admin" : "/dashboard";
}

function getRedirectMessage(path: string): string {
  return path === "/admin" ? "Redirecting to admin panel..." : "Redirecting to your dashboard...";
}

export function useLogin(options: UseLoginOptions = {}) {
  const { adminOnly = false } = options;
  const router = useRouter();
  const [status, setStatus] = useState<LoginStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    router.prefetch("/dashboard");
    router.prefetch("/admin");
  }, [router]);

  const resetSubmission = useCallback(() => {
    submittingRef.current = false;
    setStatus("idle");
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      if (submittingRef.current) return;

      submittingRef.current = true;
      setError(null);
      setRedirectMessage(null);
      setNeedsEmailVerification(false);
      setStatus("signing-in");

      try {
        const res = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (res?.error || !res?.ok) {
          if (res?.error === "EMAIL_NOT_VERIFIED") {
            setNeedsEmailVerification(true);
            setError("Please verify your email before logging in.");
          } else {
            setError(adminOnly ? "Invalid credentials." : "Invalid email or password.");
          }
          resetSubmission();
          return;
        }

        const session = await getSession();
        const role = session?.user?.role;
        const destination = getRedirectPath(role, adminOnly);

        if (!destination) {
          await signOut({ redirect: false });
          setError("This account does not have admin access. Use the student login instead.");
          resetSubmission();
          return;
        }

        setRedirectMessage(getRedirectMessage(destination));
        setStatus("redirecting");
        router.replace(destination);
      } catch {
        setError("Something went wrong. Please try again.");
        resetSubmission();
      }
    },
    [adminOnly, resetSubmission, router]
  );

  const isLoading = status === "signing-in" || status === "redirecting";

  return {
    login,
    status,
    error,
    redirectMessage,
    isLoading,
    isRedirecting: status === "redirecting",
    needsEmailVerification,
  };
}
