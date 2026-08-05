"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { ADMIN_AUDIT_ACTION_LABELS } from "@/lib/admin-audit";
import type {
  BillingSettings,
  EmailSettings,
  GeneralSettings,
  QuizSettings,
  SecuritySettings,
  SettingsSection,
  StudentSettings,
} from "@/lib/validation/platform-settings";
import type { IntegrationsStatusResponse } from "@/lib/integrations-status";

type SettingsPayload = {
  general: GeneralSettings;
  student: StudentSettings;
  quiz: QuizSettings;
  billing: BillingSettings;
  email: EmailSettings;
  security: SecuritySettings;
  updatedAt: string;
};

type SettingsTab = SettingsSection | "audit";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "student", label: "Student" },
  { id: "quiz", label: "Quiz" },
  { id: "billing", label: "Billing" },
  { id: "email", label: "Email" },
  { id: "security", label: "Security" },
  { id: "audit", label: "Audit Logs" },
];

function SettingToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
    </label>
  );
}

function IntegrationStatusCard({
  title,
  status,
}: {
  title: string;
  status: { configured: boolean; label: string; detail: string };
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-800">{title}</p>
        <Badge tone={status.configured ? "success" : "warning"}>{status.label}</Badge>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">{status.detail}</p>
    </div>
  );
}

function SaveBar({
  saving,
  message,
  error,
  onSave,
}: {
  saving: boolean;
  message: string | null;
  error: string | null;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
      <div className="min-h-5 text-sm">
        {error && <span className="text-red-600">{error}</span>}
        {!error && message && <span className="text-emerald-700">{message}</span>}
      </div>
      <Button variant="gradient" onClick={onSave} disabled={saving}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}

function AuditLogsTab() {
  const [logs, setLogs] = useState<
    Array<{
      id: string;
      action: string;
      target: string | null;
      ipAddress: string | null;
      createdAt: string;
      admin: { name: string; email: string } | null;
    }>
  >([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionOptions, setActionOptions] = useState<{ value: string; label: string }[]>([]);
  const pageSize = 20;

  const loadLogs = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search.trim()) params.set("search", search.trim());
    if (action) params.set("action", action);

    fetch(`/api/admin/audit-logs?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load audit logs");
        return r.json();
      })
      .then((data) => {
        setLogs(data.logs);
        setTotal(data.total);
        setActionOptions(data.actionOptions ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, search, action]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-ink-900">Audit logs</h2>
        <p className="mt-1 text-sm text-slate-500">
          Track admin sign-ins, content changes, billing updates, and settings saves.
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            label="Search"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Admin, action, target, IP…"
          />
          <div className="space-y-1.5 sm:min-w-[220px]">
            <label className="block text-sm font-medium text-slate-700">Action</label>
            <select
              value={action}
              onChange={(e) => {
                setPage(1);
                setAction(e.target.value);
              }}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">All actions</option>
              {actionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading audit logs…</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-red-500">{error}</p>
        ) : logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No audit entries found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Admin</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Target</th>
                  <th className="px-3 py-2">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-50">
                    <td className="px-3 py-3 text-slate-600">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-slate-800">
                      {log.admin ? (
                        <>
                          <p className="font-medium">{log.admin.name}</p>
                          <p className="text-xs text-slate-500">{log.admin.email}</p>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {ADMIN_AUDIT_ACTION_LABELS[log.action] ?? log.action}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{log.target ?? "—"}</td>
                    <td className="px-3 py-3 text-slate-500">{log.ipAddress ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {total} entr{total === 1 ? "y" : "ies"}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-slate-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export function AdminSettingsPanel() {
  const [tab, setTab] = useState<SettingsTab>("general");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationsStatusResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadSettings = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    fetch("/api/admin/settings")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load settings");
        return r.json();
      })
      .then((data) => {
        setSettings(data.settings);
        setIntegrations(data.integrations);
      })
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function saveSection(section: SettingsSection, data: Record<string, unknown>) {
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, data }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to save settings");
      setSaveMessage("Settings saved successfully.");
      loadSettings();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400">
        Loading settings…
      </div>
    );
  }

  if (loadError || !settings) {
    return (
      <Card>
        <CardBody className="space-y-4 py-8 text-center">
          <p className="text-sm text-red-500">{loadError ?? "Unable to load settings."}</p>
          <Button variant="outline" onClick={loadSettings}>
            Retry
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure platform behaviour, integrations, security, and review admin activity."
      />

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              setSaveMessage(null);
              setSaveError(null);
            }}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === item.id
                ? "bg-ink-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "general" && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">General</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Platform name"
                value={settings.general.platformName}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, platformName: e.target.value },
                  })
                }
              />
              <Input
                label="Support email"
                type="email"
                value={settings.general.supportEmail}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, supportEmail: e.target.value },
                  })
                }
              />
              <Input
                label="Platform URL"
                value={settings.general.platformUrl}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, platformUrl: e.target.value },
                  })
                }
              />
              <Input
                label="Timezone"
                value={settings.general.timezone}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, timezone: e.target.value },
                  })
                }
              />
              <Input
                label="Currency"
                value={settings.general.currency}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, currency: e.target.value.toUpperCase() },
                  })
                }
                hint="ISO 4217 code, e.g. GBP"
              />
            </div>
            <SettingToggle
              label="Maintenance mode"
              description="Pause student-facing routes and show the maintenance page."
              checked={settings.general.maintenanceMode}
              onChange={(value) =>
                setSettings({
                  ...settings,
                  general: { ...settings.general, maintenanceMode: value },
                })
              }
            />
            <SaveBar
              saving={saving}
              message={saveMessage}
              error={saveError}
              onSave={() => saveSection("general", settings.general)}
            />
          </CardBody>
        </Card>
      )}

      {tab === "student" && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">Student</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-3">
              <SettingToggle
                label="Allow registration"
                checked={settings.student.allowRegistration}
                onChange={(v) =>
                  setSettings({ ...settings, student: { ...settings.student, allowRegistration: v } })
                }
              />
              <SettingToggle
                label="Require email verification"
                checked={settings.student.requireEmailVerification}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    student: { ...settings.student, requireEmailVerification: v },
                  })
                }
              />
              <SettingToggle
                label="Allow bookmarks"
                checked={settings.student.allowBookmarks}
                onChange={(v) =>
                  setSettings({ ...settings, student: { ...settings.student, allowBookmarks: v } })
                }
              />
              <SettingToggle
                label="Allow question flagging"
                checked={settings.student.allowQuestionFlagging}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    student: { ...settings.student, allowQuestionFlagging: v },
                  })
                }
              />
              <SettingToggle
                label="Allow difficulty rating"
                checked={settings.student.allowDifficultyRating}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    student: { ...settings.student, allowDifficultyRating: v },
                  })
                }
              />
              <SettingToggle
                label="Allow answer review"
                checked={settings.student.allowAnswerReview}
                onChange={(v) =>
                  setSettings({ ...settings, student: { ...settings.student, allowAnswerReview: v } })
                }
              />
            </div>
            <Input
              label="Session timeout (minutes)"
              type="number"
              min={5}
              max={1440}
              value={settings.student.studentSessionTimeoutMinutes}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  student: {
                    ...settings.student,
                    studentSessionTimeoutMinutes: parseInt(e.target.value, 10) || 120,
                  },
                })
              }
            />
            <SaveBar
              saving={saving}
              message={saveMessage}
              error={saveError}
              onSave={() => saveSection("student", settings.student)}
            />
          </CardBody>
        </Card>
      )}

      {tab === "quiz" && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">Quiz</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Default pass mark (%)"
                type="number"
                min={0}
                max={100}
                value={settings.quiz.defaultPassMark}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    quiz: { ...settings.quiz, defaultPassMark: parseInt(e.target.value, 10) || 50 },
                  })
                }
              />
              <Input
                label="Default timer (minutes)"
                type="number"
                min={0}
                max={240}
                value={settings.quiz.defaultTimerMinutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    quiz: {
                      ...settings.quiz,
                      defaultTimerMinutes: parseInt(e.target.value, 10) || 0,
                    },
                  })
                }
                hint="0 = untimed when no duration is chosen"
              />
            </div>
            <div className="grid gap-3">
              {(
                [
                  ["randomiseQuestions", "Randomise questions"],
                  ["randomiseAnswerOptions", "Randomise answer options"],
                  ["allowPreviousQuestion", "Allow previous-question navigation"],
                  ["showExplanationAfterCheck", "Show explanation after Check Answer"],
                  ["enableNegativeMarking", "Enable negative marking"],
                ] as const
              ).map(([key, label]) => (
                <SettingToggle
                  key={key}
                  label={label}
                  checked={settings.quiz[key]}
                  onChange={(v) =>
                    setSettings({ ...settings, quiz: { ...settings.quiz, [key]: v } })
                  }
                />
              ))}
            </div>
            <SaveBar
              saving={saving}
              message={saveMessage}
              error={saveError}
              onSave={() => saveSection("quiz", settings.quiz)}
            />
          </CardBody>
        </Card>
      )}

      {tab === "billing" && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">Billing</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-3">
              <SettingToggle
                label="Enable monthly plan"
                checked={settings.billing.enableMonthlyPlan}
                onChange={(v) =>
                  setSettings({ ...settings, billing: { ...settings.billing, enableMonthlyPlan: v } })
                }
              />
              <SettingToggle
                label="Enable yearly plan"
                checked={settings.billing.enableYearlyPlan}
                onChange={(v) =>
                  setSettings({ ...settings, billing: { ...settings.billing, enableYearlyPlan: v } })
                }
              />
              <SettingToggle
                label="Enable paper purchases"
                checked={settings.billing.enablePaperPurchases}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    billing: { ...settings.billing, enablePaperPurchases: v },
                  })
                }
              />
              <SettingToggle
                label="Enable mock-exam purchases"
                checked={settings.billing.enableMockExamPurchases}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    billing: { ...settings.billing, enableMockExamPurchases: v },
                  })
                }
              />
            </div>
            {integrations && (
              <IntegrationStatusCard title="Stripe environment" status={integrations.stripe} />
            )}
            <SaveBar
              saving={saving}
              message={saveMessage}
              error={saveError}
              onSave={() => saveSection("billing", settings.billing)}
            />
          </CardBody>
        </Card>
      )}

      {tab === "email" && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">Email</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Sender name"
                value={settings.email.senderName}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    email: { ...settings.email, senderName: e.target.value },
                  })
                }
              />
              <Input
                label="Sender email"
                type="email"
                value={settings.email.senderEmail}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    email: { ...settings.email, senderEmail: e.target.value },
                  })
                }
              />
            </div>
            <div className="grid gap-3">
              <SettingToggle
                label="Enable verification emails"
                checked={settings.email.enableVerificationEmails}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    email: { ...settings.email, enableVerificationEmails: v },
                  })
                }
              />
              <SettingToggle
                label="Enable reset-password emails"
                checked={settings.email.enableResetPasswordEmails}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    email: { ...settings.email, enableResetPasswordEmails: v },
                  })
                }
              />
            </div>
            {integrations && (
              <IntegrationStatusCard title="Resend configuration" status={integrations.resend} />
            )}
            <SaveBar
              saving={saving}
              message={saveMessage}
              error={saveError}
              onSave={() => saveSection("email", settings.email)}
            />
          </CardBody>
        </Card>
      )}

      {tab === "security" && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">Security</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Minimum password length"
                type="number"
                min={6}
                max={128}
                value={settings.security.minPasswordLength}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    security: {
                      ...settings.security,
                      minPasswordLength: parseInt(e.target.value, 10) || 8,
                    },
                  })
                }
              />
              <Input
                label="Maximum login attempts"
                type="number"
                min={3}
                max={50}
                value={settings.security.maxLoginAttempts}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    security: {
                      ...settings.security,
                      maxLoginAttempts: parseInt(e.target.value, 10) || 10,
                    },
                  })
                }
              />
              <Input
                label="Admin session timeout (minutes)"
                type="number"
                min={15}
                max={1440}
                value={settings.security.adminSessionTimeoutMinutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    security: {
                      ...settings.security,
                      adminSessionTimeoutMinutes: parseInt(e.target.value, 10) || 480,
                    },
                  })
                }
              />
            </div>
            <SettingToggle
              label="Require admin 2FA"
              description="Placeholder — two-factor authentication is not implemented yet."
              checked={settings.security.requireAdmin2fa}
              onChange={(v) =>
                setSettings({ ...settings, security: { ...settings.security, requireAdmin2fa: v } })
              }
              disabled
            />
            <SettingToggle
              label="Maintenance access for admins only"
              description="Allow signed-in admins to use the platform while maintenance mode is active."
              checked={settings.security.maintenanceAdminAccess}
              onChange={(v) =>
                setSettings({
                  ...settings,
                  security: { ...settings.security, maintenanceAdminAccess: v },
                })
              }
            />
            <SaveBar
              saving={saving}
              message={saveMessage}
              error={saveError}
              onSave={() => saveSection("security", settings.security)}
            />
          </CardBody>
        </Card>
      )}

      {tab === "audit" && <AuditLogsTab />}
    </div>
  );
}
