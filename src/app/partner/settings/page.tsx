"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { PortalIcon } from "@/components/portal/PortalIcons";

type PartnerSettings = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  contactEmail: string | null;
  status: string;
  allowPublicRegistration: boolean;
  studentCount: number;
  classCount: number;
  adminCount: number;
};

export default function PartnerSettingsPage() {
  const [partner, setPartner] = useState<PartnerSettings | null>(null);
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [allowPublicRegistration, setAllowPublicRegistration] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const signupLink = useMemo(() => {
    if (!partner || typeof window === "undefined") return "";
    return `${window.location.origin}/register?schoolId=${partner.id}`;
  }, [partner]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/partner/settings");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load settings");
        if (!cancelled) {
          setPartner(json.partner);
          setName(json.partner.name);
          setContactEmail(json.partner.contactEmail ?? "");
          setLogoUrl(json.partner.logoUrl ?? "");
          setAllowPublicRegistration(Boolean(json.partner.allowPublicRegistration));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/partner/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          contactEmail: contactEmail || null,
          logoUrl: logoUrl || null,
          allowPublicRegistration,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setPartner((prev) => (prev ? { ...prev, ...json.partner } : prev));
      setMessage("Settings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function copySignupLink() {
    if (!signupLink) return;
    try {
      await navigator.clipboard.writeText(signupLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link. Copy it manually from the field.");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!partner) return <Alert tone="error">{error ?? "Partner not found"}</Alert>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Organisation profile and public student signup for your school."
      />

      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <PortalIcon name="partners" className="h-6 w-6" />
              </span>
              <h2 className="text-base font-semibold text-ink-900">Organisation</h2>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              label="Contact email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
            <Input
              label="Logo URL"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              hint="Optional public image URL"
            />
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <p>
                Slug: <span className="font-medium text-ink-900">{partner.slug}</span>
              </p>
              <p className="mt-1 flex items-center gap-2">
                Status:{" "}
                <Badge tone={partner.status === "ACTIVE" ? "success" : "danger"}>{partner.status}</Badge>
              </p>
            </div>
            <Button variant="success" disabled={busy} onClick={() => void save()}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <PortalIcon name="students" className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-ink-900">Student signup</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  When students register and choose your school, they appear in your Students list.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                checked={allowPublicRegistration}
                onChange={(e) => setAllowPublicRegistration(e.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium text-ink-900">
                  Show school on public signup
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Students can select your school on `/register`. Turn off to hide from the school list.
                </span>
              </span>
            </label>

            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-700">Shareable signup link</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={
                    allowPublicRegistration
                      ? signupLink
                      : "Enable public signup to get a shareable link"
                  }
                  readOnly
                  disabled={!allowPublicRegistration}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!allowPublicRegistration || !signupLink}
                  onClick={() => void copySignupLink()}
                  className="shrink-0"
                >
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Share this with students. Your school is pre-selected; signup data (including source)
                shows in Partner Portal.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
              <p>
                Students: <strong className="text-ink-900">{partner.studentCount}</strong>
              </p>
              <p className="mt-1">
                Classes: <strong className="text-ink-900">{partner.classCount}</strong>
              </p>
              <p className="mt-1">
                Partner admins: <strong className="text-ink-900">{partner.adminCount}</strong>
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
