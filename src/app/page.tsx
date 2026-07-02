import Link from "next/link";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const features = [
  {
    title: "Mock Exams Built Like the Real Thing",
    description:
      "Timed, exam-style multiple choice questions across every ACCA paper, written to mirror the structure and difficulty of the real exam.",
  },
  {
    title: "Progress Tracking That Means Something",
    description:
      "Every attempt feeds a dashboard of scores, pass rates, and trends — so you always know exactly where you stand.",
  },
  {
    title: "Weak Topic Analysis",
    description:
      "InsightApex breaks down performance by topic, surfacing the exact areas costing you marks so you study smarter, not longer.",
  },
  {
    title: "Detailed Answer Explanations",
    description:
      "Review every question after submission with the correct answer and a clear explanation of the reasoning.",
  },
];

const papers = [
  { code: "BT", title: "Business and Technology" },
  { code: "MA", title: "Management Accounting" },
  { code: "FA", title: "Financial Accounting" },
  { code: "PM", title: "Performance Management" },
  { code: "FR", title: "Financial Reporting" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="mx-auto max-w-7xl px-6 py-24 text-center">
          <Badge tone="brand">Built for ACCA students</Badge>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
            Pass your ACCA exams with confidence, not guesswork.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            InsightApex combines realistic mock exams, precise progress tracking, and weak-topic
            analysis into one clean platform — so every study hour counts.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg">Register for free</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">Log in</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-ink-900">Everything you need to pass, in one place</h2>
          <p className="mt-4 text-slate-600">
            A focused toolkit designed around how ACCA exams are actually structured.
          </p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {features.map((f) => (
            <Card key={f.title}>
              <CardBody>
                <h3 className="text-lg font-semibold text-ink-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{f.description}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* Papers */}
      <section id="papers" className="bg-ink-900 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white">Practice across every ACCA paper</h2>
            <p className="mt-4 text-slate-300">Start with the Applied Knowledge and Applied Skills levels.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {papers.map((p) => (
              <div
                key={p.code}
                className="rounded-xl2 border border-white/10 bg-white/5 p-5 text-center transition hover:bg-white/10"
              >
                <div className="text-2xl font-bold text-brand-300">{p.code}</div>
                <div className="mt-1 text-sm text-slate-300">{p.title}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-ink-900">How InsightApex works</h2>
        </div>
        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {[
            { step: "1", title: "Choose a paper", desc: "Pick from BT through FR and select a topic to focus on." },
            { step: "2", title: "Take a timed quiz", desc: "Answer exam-style MCQs, flag tricky ones, then submit." },
            { step: "3", title: "Review your results", desc: "See your score, weak topics, and detailed explanations." },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
                {s.step}
              </div>
              <h3 className="mt-4 font-semibold text-ink-900">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="rounded-xl2 bg-brand-600 px-8 py-16 text-center">
          <h2 className="text-3xl font-bold text-white">Start practicing for free today</h2>
          <p className="mx-auto mt-4 max-w-xl text-brand-100">
            No credit card required. Create an account and start your first mock exam in minutes.
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="mt-8">
              Create your free account
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
