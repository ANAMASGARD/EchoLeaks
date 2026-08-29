import Link from "next/link";
import { Navbar } from "@/components/landing/navbar";

export default function DashboardPage() {
  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <main className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-2xl flex-col items-center justify-center gap-6 px-6 pb-16 pt-24 text-center">
        <p className="text-xs font-medium tracking-[0.18em] text-foreground/50 uppercase">
          Dashboard
        </p>
        <h1 className="font-head text-4xl tracking-tight text-foreground sm:text-5xl">
          Coming soon
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-foreground/70">
          File protection and leak attribution tools are on the way. Check back
          soon.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border-2 border-black bg-primary px-6 py-3 text-sm font-medium text-black shadow-md transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          Back to landing
        </Link>
      </main>
    </div>
  );
}
