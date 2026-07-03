import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-brand-600">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink-900">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        The page you are looking for does not exist or may have been moved.
      </p>
      <Link href="/" className="mt-6">
        <Button>Back to home</Button>
      </Link>
    </div>
  );
}
