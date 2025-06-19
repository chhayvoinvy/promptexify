export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto relative flex min-h-screen flex-col">
      <main className="flex-1">{children}</main>
    </div>
  );
}
