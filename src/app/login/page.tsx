import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_12%_-8%,rgba(56,189,248,0.24),transparent_32%),radial-gradient(circle_at_88%_8%,rgba(22,119,255,0.13),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#f5f8ff_48%,#f7fbff_100%)] flex items-center justify-center px-4"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif',
      }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-[#10233F]">
            AI Teaching Assistant
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-2">교수 로그인</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
