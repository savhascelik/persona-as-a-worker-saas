import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Persona-as-a-Worker
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-balance">
            Sign in to your seeding console
          </h1>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-card border border-border shadow-none",
            },
          }}
        />
      </div>
    </main>
  )
}
