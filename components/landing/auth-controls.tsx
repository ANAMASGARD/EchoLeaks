"use client";

import { usePathname } from "next/navigation";
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

const navButtonClass =
  "inline-flex items-center justify-center rounded-full border-2 border-black px-4 py-2 text-sm font-medium text-black shadow-sm transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-md active:translate-x-0.5 active:translate-y-0.5 active:shadow-none";

export function AuthControls() {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const authMode = isLanding ? "modal" : "redirect";
  const redirectAfterAuth = isLanding ? "/" : "/dashboard";

  return (
    <div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
      <Show when="signed-out">
        <SignInButton mode={authMode} fallbackRedirectUrl={redirectAfterAuth}>
          <button
            type="button"
            className={`${navButtonClass} bg-background hover:bg-muted`}
          >
            Sign In
          </button>
        </SignInButton>
        <SignUpButton mode={authMode} fallbackRedirectUrl={redirectAfterAuth}>
          <button
            type="button"
            className={`${navButtonClass} bg-primary hover:bg-primary-hover`}
          >
            Get Started
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton
          appearance={{
            elements: {
              avatarBox: "size-9 rounded-full border-2 border-black shadow-sm",
            },
          }}
        />
      </Show>
    </div>
  );
}
