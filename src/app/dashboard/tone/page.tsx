import { ToneClient } from "./tone-client";

export default function TonePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-[24px] border border-blue-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(237,247,255,0.82))] p-7 shadow-[0_18px_48px_-30px_rgba(23,87,168,0.42)]">
        <p className="text-xs font-bold text-[#0F5FD7]">Tone Assistant</p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#10233F]">공지/메일 톤 보정</h1>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-500">
          학생에게 보낼 공지나 이메일을 입력하면 권위적·강압적으로 읽힐 수 있는 표현을 확인하고, 더 부드러운 대안을 참고할 수 있습니다.
        </p>
      </section>
      <ToneClient />
    </div>
  );
}
