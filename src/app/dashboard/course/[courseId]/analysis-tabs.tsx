"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  feedbackTab: React.ReactNode;
  deepTab: React.ReactNode;
  compareTab: React.ReactNode;
}

export function AnalysisTabs({ feedbackTab, deepTab, compareTab }: Props) {
  return (
    <Tabs defaultValue="feedback">
      <TabsList className="mb-4">
        <TabsTrigger value="feedback">피드백 현황</TabsTrigger>
        <TabsTrigger value="deep">심층 분석</TabsTrigger>
        <TabsTrigger value="compare">비교 분석</TabsTrigger>
      </TabsList>

      <TabsContent value="feedback" className="space-y-6 mt-0">
        {feedbackTab}
      </TabsContent>

      <TabsContent value="deep" className="space-y-6 mt-0">
        {deepTab}
      </TabsContent>

      <TabsContent value="compare" className="space-y-6 mt-0">
        {compareTab}
      </TabsContent>
    </Tabs>
  );
}
