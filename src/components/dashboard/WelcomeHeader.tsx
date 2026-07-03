import Link from "next/link";
import { MountainIllustration } from "@/components/dashboard/DashboardIcons";

interface WelcomeHeaderProps {
  studentName: string;
  hasAttempts: boolean;
}

export function WelcomeHeader({ studentName, hasAttempts }: WelcomeHeaderProps) {
  const firstName = studentName.split(" ")[0];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-6 shadow-panel sm:p-8">
      <div className="pointer-events-none absolute -right-4 top-0 hidden h-full w-48 opacity-90 sm:block md:w-56 lg:w-64">
        <MountainIllustration />
      </div>
      <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

      <div className="relative max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Welcome back, {firstName} 👋
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-brand-100 sm:text-base">
          {hasAttempts
            ? "Every question you solve today brings you closer to your goals. Keep the momentum going!"
            : "Your ACCA journey starts here. Take your first practice quiz to unlock personalised insights."}
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/dashboard/quiz"
            className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow-card transition-colors hover:bg-brand-50"
          >
            Start Practice
          </Link>
          <Link
            href="/dashboard/mock-exams"
            className="inline-flex items-center justify-center rounded-xl border-2 border-white/70 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            Mock Exam
          </Link>
        </div>
      </div>
    </div>
  );
}
