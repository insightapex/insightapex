import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface WelcomeHeaderProps {
  studentName: string;
  hasAttempts: boolean;
}

export function WelcomeHeader({ studentName, hasAttempts }: WelcomeHeaderProps) {
  const firstName = studentName.split(" ")[0];

  return (
    <div className="relative overflow-hidden rounded-xl2 border border-slate-200/80 bg-white p-6 shadow-card sm:p-8">
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-brand-100/60 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-brand-50 blur-2xl" />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <p className="text-sm font-medium text-brand-600">Student Dashboard</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 sm:text-base">
            {hasAttempts
              ? "Keep building momentum — every practice session brings you closer to exam success."
              : "Your ACCA journey starts here. Take your first practice quiz to unlock personalised insights."}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <Link href="/dashboard/quiz">
            <Button size="lg" className="w-full sm:w-auto">
              Start Practice
            </Button>
          </Link>
          <Link href="/dashboard/mock-exams">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Mock Exam
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
