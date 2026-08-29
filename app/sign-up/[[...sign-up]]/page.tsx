import { SignUp } from "@clerk/nextjs";
import { Navbar } from "@/components/landing/navbar";

export default function SignUpPage() {
  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <div className="flex min-h-svh items-center justify-center px-4 pt-16 pb-12">
        <SignUp />
      </div>
    </div>
  );
}
