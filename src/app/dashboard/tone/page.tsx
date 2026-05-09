import { ToneClient } from "./tone-client";

export default function TonePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">공지/메일 톤 보정</h1>
      <p className="text-gray-500 text-sm mb-6">
        학생에게 보낼 공지나 이메일을 입력하면 권위적·강압적 표현을 감지하고
        부드러운 대안을 제안합니다.
      </p>
      <ToneClient />
    </div>
  );
}
