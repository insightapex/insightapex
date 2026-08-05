import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-surface px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand text-lg font-bold text-white shadow-glow">
        IA
      </div>
      <p className="mt-6 text-sm font-medium text-brand-600">404</p>
      <h1 className="mt-2 text-2xl font-bold text-ink-900 sm:text-3xl">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        The page you are looking for does not exist or may have been moved.
      </p>
      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Link href="/">
          <Button>Back to home</Button>
        </Link>
        <Link href="/login">
          <Button variant="outline">Log in</Button>
        </Link>
      </div>
    </div>
  );
}
