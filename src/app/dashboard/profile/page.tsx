"use client";

import { useSession } from "next-auth/react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ProfilePage() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your account details.</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-ink-900">Account Information</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Avatar initial */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-2xl font-bold text-white">
              {user?.name?.[0]?.toUpperCase() ?? "S"}
            </div>
            <div>
              <p className="font-semibold text-slate-800">{user?.name}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>

          <Input label="Full name" defaultValue={user?.name ?? ""} disabled />
          <Input label="Email address" type="email" defaultValue={user?.email ?? ""} disabled />

          <p className="text-xs text-slate-400">
            Name and email editing will be available in a future update.
          </p>

          <div className="pt-2">
            <Button variant="outline" disabled>Save changes</Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-ink-900">Password</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-slate-500">
            Use the{" "}
            <a href="/forgot-password" className="text-brand-600 hover:underline">
              forgot password
            </a>{" "}
            flow to reset your password via email.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
