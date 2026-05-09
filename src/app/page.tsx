import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI Teaching Assistant
        </h1>
        <p className="text-gray-500 mb-8">
          자체 강의평가 플랫폼 + 교수용 AI 분석 도구
        </p>

        <Card>
          <CardContent className="py-8 space-y-4">
            <p className="text-sm text-gray-600">
              교수님이신가요? 대시보드에서 피드백을 확인하세요.
            </p>
            <Link href="/dashboard">
              <Button className="w-full">교수 대시보드</Button>
            </Link>
            <p className="text-xs text-gray-400 mt-4">
              학생이신가요? 교수님이 제공한 피드백 링크를 통해 접근해주세요.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
