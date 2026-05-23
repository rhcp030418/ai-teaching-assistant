import { AlertTriangle, BookOpenCheck, CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";

const SECTION =
  "rounded-[24px] border border-blue-100 bg-white/90 p-6 shadow-[0_18px_48px_-30px_rgba(23,87,168,0.42)]";
const ITEM =
  "rounded-[18px] border border-blue-100 bg-white/80 p-4 shadow-[0_10px_30px_rgba(23,87,168,0.05)]";
const CLICKABLE_ITEM =
  `${ITEM} block transition duration-200 ease-out hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/45 hover:shadow-[0_16px_34px_rgba(23,87,168,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2`;

type GuideItem = {
  title: string;
  body: string;
  href?: string;
};

const required = [
  {
    title: "강의 선택",
    body: "대시보드의 강의 목록에서 확인할 강의를 선택합니다. 모든 분석과 채팅은 선택한 강의 범위 안에서만 확인하는 것을 기준으로 합니다.",
    href: "/dashboard",
  },
  {
    title: "평가 라운드 열기",
    body: "관리 및 기록에서 주차별 평가 라운드를 만들고 시작·종료 시간을 지정합니다. 진행 중인 라운드가 있어야 학생 피드백이 해당 주차에 모입니다.",
    href: "/dashboard",
  },
  {
    title: "피드백 링크 배포",
    body: "관리 및 기록에서 추가 피드백 링크를 생성한 뒤 e-class나 공지에 공유합니다. 학생은 링크로 들어와 익명 피드백을 제출합니다.",
    href: "/dashboard",
  },
  {
    title: "현황 요약 확인",
    body: "현황 요약에서 응답 수, 학생 의견 요약, 주요 지표 흐름, 주차별 평가 추이를 먼저 확인합니다. 이 화면은 매주 가장 먼저 보는 기본 화면입니다.",
    href: "/dashboard",
  },
];

const optional = [
  {
    title: "지원 인사이트",
    body: "피드백이 충분히 쌓였을 때 원인 연결 분석과 로드맵을 참고합니다. 수업 운영을 대신 결정하는 기능이 아니라, 학생 반응을 더 빨리 훑기 위한 보조 도구입니다.",
    href: "/dashboard",
  },
  {
    title: "강의자료 분석",
    body: "PDF, PPT, TXT 자료를 업로드하면 자료 난이도, 용어 밀도, 예시 충분도와 학생 반응의 연결 맥락을 볼 수 있습니다.",
    href: "/dashboard",
  },
  {
    title: "비교 참고",
    body: "유사 강의 경향과 익명 사례를 참고합니다. 동일한 방식으로 따라 하라는 의미가 아니라, 수업을 바라보는 비교 관점을 넓히는 용도입니다.",
    href: "/dashboard",
  },
  {
    title: "AI 강의 어시스턴트",
    body: "오른쪽 하단 버튼을 열어 현재 강의 데이터에 대해 질문합니다. 답변은 선택한 강의의 피드백과 자료 맥락을 바탕으로 한 참고 답변입니다.",
    href: "/dashboard",
  },
  {
    title: "말투 교정",
    body: "공지나 피드백 답변 문장을 정돈할 때 사용합니다. 학생에게 전달하기 전 최종 표현은 교수자가 직접 확인하는 것이 좋습니다.",
    href: "/dashboard/tone",
  },
];

const caution = [
  {
    title: "응답 수가 적을 때",
    body: "피드백이 3건 미만이거나 응답률이 낮으면 차트와 요약이 한쪽 의견에 치우칠 수 있습니다. 수치보다 실제 의견 원문을 함께 확인하세요.",
    href: "/dashboard",
  },
  {
    title: "AI 요약·분석 결과",
    body: "AI는 학생 의견을 정리하는 도구입니다. 표현을 오해하거나, 원인을 단정하거나, 일부 의견을 과하게 일반화할 수 있습니다.",
    href: "/dashboard",
  },
  {
    title: "비교와 사례",
    body: "다른 강의와의 비교는 참고용입니다. 강의 목표, 수강생 구성, 평가 방식이 다르면 같은 수치라도 의미가 달라질 수 있습니다.",
    href: "/dashboard",
  },
  {
    title: "강의자료 분석",
    body: "자료 텍스트 추출 품질이나 파일 형식에 따라 분석이 누락될 수 있습니다. 스캔 이미지 중심 자료는 PDF 텍스트 변환 후 업로드하는 편이 좋습니다.",
    href: "/dashboard",
  },
];

function GuideSection({
  icon: Icon,
  title,
  description,
  items,
}: {
  icon: typeof CheckCircle2;
  title: string;
  description: string;
  items: GuideItem[];
}) {
  return (
    <section className={SECTION}>
      <div className="flex items-start gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] bg-blue-50 text-[#1677FF]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-[#10233F]">{title}</h2>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-4">
        {items.map((item) => {
          const content = (
            <>
              <h3 className="text-sm font-extrabold text-[#10233F]">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#27496D]">{item.body}</p>
              {item.href && (
                <p className="mt-4 text-xs font-extrabold text-[#0F5FD7]">기능 위치로 이동 →</p>
              )}
            </>
          );

          if (item.href) {
            return (
              <Link key={item.title} href={item.href} className={CLICKABLE_ITEM}>
                {content}
              </Link>
            );
          }

          return (
            <article key={item.title} className={ITEM}>
              {content}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function GuidePage() {
  return (
    <div className="space-y-8">
      <div className="rounded-[24px] border border-blue-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(237,247,255,0.82))] p-7 shadow-[0_18px_48px_-30px_rgba(23,87,168,0.42)]">
        <p className="text-xs font-bold text-[#0F5FD7]">User Guide</p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#10233F]">기능 사용 설명서</h1>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-500">
          교수자가 실제로 어떤 순서로 기능을 쓰면 되는지 정리한 안내입니다. AI 기능은 학생 의견을 빠르게 정리하기 위한 참고 도구이며, 수업 운영의 최종 판단은 교수자가 직접 결정합니다.
        </p>
      </div>

      <GuideSection
        icon={CheckCircle2}
        title="필수 기능"
        description="강의 피드백을 수집하고 매주 현황을 확인하기 위해 반드시 사용하는 흐름입니다."
        items={required}
      />

      <GuideSection
        icon={Sparkles}
        title="필수는 아니지만 쓰면 좋은 기능"
        description="피드백이 충분히 쌓였거나 자료가 준비되어 있을 때 참고하면 좋은 보조 기능입니다."
        items={optional}
      />

      <GuideSection
        icon={AlertTriangle}
        title="주의해서 봐야 하는 기능"
        description="AI와 통계 기반 화면은 편리하지만, 데이터 규모와 맥락에 따라 해석이 달라질 수 있습니다."
        items={caution}
      />

      <section className="rounded-[24px] border border-amber-200 bg-amber-50/70 p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] bg-white/80 text-amber-600">
            <BookOpenCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[#10233F]">AI 사용 시 공통 주의사항</h2>
            <p className="mt-2 text-sm leading-7 text-[#27496D]">
              AI는 학생 의견을 요약하고 관련 가능성이 있는 맥락을 정리하지만, 할루시네이션, 오탐, 누락, 과도한 원인 추정이 발생할 수 있습니다. 특히 낮은 응답 수, 짧은 의견, 텍스트 추출 품질이 낮은 강의자료에서는 결과를 그대로 확정하지 말고 원문 의견과 수업 맥락을 함께 확인해야 합니다.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
