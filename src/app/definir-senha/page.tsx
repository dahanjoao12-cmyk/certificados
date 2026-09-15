import { SetPasswordForm } from "./set-password-form";

export default function SetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Defina sua senha</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">
          Escolha uma senha para acessar o sistema de certificados digitais.
        </p>
        <SetPasswordForm />
      </div>
    </div>
  );
}
