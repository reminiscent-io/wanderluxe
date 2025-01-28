export default function AuthPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome</h1>
        <a 
          href="https://repl.it/auth_with_repl_site" 
          className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Login with Replit
        </a>
      </div>
    </div>
  );
}