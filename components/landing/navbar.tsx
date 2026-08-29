import Link from "next/link";
import Image from "next/image";
import { AuthControls } from "@/components/landing/auth-controls";

export function Navbar() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <nav className="flex h-16 items-center justify-between pl-3 pr-5 sm:pl-4 sm:pr-8">
        <Link
          href="/"
          className="pointer-events-auto inline-flex items-center"
          aria-label="EchoLeaks home"
        >
          <Image
            src="/io.github.lo2dev.Echo.svg"
            alt="EchoLeaks"
            width={36}
            height={36}
            priority
            className="h-8 w-8 sm:h-9 sm:w-9"
          />
        </Link>

        <AuthControls />
      </nav>
    </header>
  );
}
