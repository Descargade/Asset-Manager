import { Link } from "wouter";
import { Zap, CheckCircle, BarChart2, Sparkles, ArrowRight } from "lucide-react";

const features = [
  {
    icon: CheckCircle,
    title: "Intelligent Task Management",
    desc: "Create, prioritize, and track every task with precision. Never lose track of what matters.",
  },
  {
    icon: BarChart2,
    title: "Productivity Analytics",
    desc: "Visualize your output over time. Spot patterns. Stay ahead of your own goals.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Optimization",
    desc: "Let AI analyze your workload and suggest the optimal sequence for your day.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">FlowSpace</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            data-testid="landing-sign-in"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="text-sm font-medium bg-primary text-primary-foreground px-4 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
            data-testid="landing-sign-up"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-8">
          <Sparkles className="w-3 h-3" />
          AI-powered productivity
        </div>

        <h1 className="text-5xl md:text-6xl font-bold tracking-tight max-w-3xl leading-tight mb-6">
          The command center
          <br />
          <span className="text-primary">for serious output.</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-xl mb-10 leading-relaxed">
          FlowSpace combines task management, productivity analytics, and AI
          optimization into one focused workspace. Built for people who take
          their results seriously.
        </p>

        <div className="flex items-center gap-4">
          <Link
            href="/sign-up"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors"
            data-testid="landing-cta-primary"
          >
            Start free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/sign-in"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground border border-border px-6 py-3 rounded-md hover:bg-secondary transition-colors"
          >
            Sign in
          </Link>
        </div>
      </main>

      <section className="border-t border-border px-8 py-20">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-8 py-5 text-center text-xs text-muted-foreground">
        FlowSpace — AI Productivity Suite
      </footer>
    </div>
  );
}
