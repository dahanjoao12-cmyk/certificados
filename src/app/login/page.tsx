import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Certificados Digitais</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">
          Acesso interno do escritório. Entre com suas credenciais.
        </p>
        <LoginForm next={next ?? "/"} />
      </div>
    </div>
  );
}
