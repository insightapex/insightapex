"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/marketing/AuthLayout";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";

type Option = { id: string; name: string };

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const schoolIdFromUrl = searchParams.get("schoolId")?.trim() ?? "";

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    schoolId: schoolIdFromUrl,
    registrationSourceId: "",
  });
  const [schools, setSchools] = useState<Option[]>([]);
  const [sources, setSources] = useState<Option[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [schoolLocked, setSchoolLocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/register/options");
        const data = await res.json();
        if (!cancelled && res.ok) {
          const schoolList: Option[] = data.schools ?? [];
          setSchools(schoolList);
          setSources(data.sources ?? []);

          if (schoolIdFromUrl) {
            const match = schoolList.find((s) => s.id === schoolIdFromUrl);
            if (match) {
              setForm((prev) => ({ ...prev, schoolId: match.id }));
              setSchoolLocked(true);
            } else {
              setError(
                "This school is not accepting public signups right now. Choose another school or ask your school admin."
              );
            }
          }
        }
      } catch {
        /* options preload is best-effort; server still validates */
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolIdFromUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthLayout title="Check your email" subtitle="We've sent a verification link to your inbox.">
        <p className="text-sm text-slate-600">
          Open the email from InsightApex and click <strong>Verify email address</strong>. Check your spam folder if
          you don&apos;t see it within a few minutes.
        </p>
        <p className="mt-3 text-sm text-slate-500">Redirecting you to login…</p>
      </AuthLayout>
    );
  }

  const selectedSchool = schools.find((s) => s.id === form.schoolId);

  return (
    <AuthLayout
      title="Create your account"
      subtitle={
        schoolLocked && selectedSchool
          ? `Join ${selectedSchool.name} and start practicing ACCA questions.`
          : "Choose your school and start practicing ACCA questions for free."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          label="Email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label="Password"
          type="password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Select
          label="School"
          required
          placeholder={optionsLoading ? "Loading schools…" : "Select your school"}
          value={form.schoolId}
          onChange={(e) => setForm({ ...form, schoolId: e.target.value })}
          options={schools.map((s) => ({ value: s.id, label: s.name }))}
          disabled={schoolLocked || optionsLoading}
        />
        {schoolLocked && selectedSchool && (
          <p className="text-xs text-emerald-700">
            You are registering under <strong>{selectedSchool.name}</strong>. Your partner school will
            see your signup in their portal.
          </p>
        )}
        <Select
          label="How did you hear about us?"
          required
          placeholder={optionsLoading ? "Loading sources…" : "Select a source"}
          value={form.registrationSourceId}
          onChange={(e) => setForm({ ...form, registrationSourceId: e.target.value })}
          options={sources.map((s) => ({ value: s.id, label: s.name }))}
        />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Spinner className="h-4 w-4" />}
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout title="Create your account" subtitle="Loading signup form…">
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        </AuthLayout>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
