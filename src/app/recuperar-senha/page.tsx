import { RecoverPasswordForm } from "./recover-password-form";

export default function RecoverPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Esqueci minha senha</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">
          Informe seu e-mail e enviaremos um link para você redefinir a senha.
        </p>
        <RecoverPasswordForm />
      </div>
    </div>
  );
}
