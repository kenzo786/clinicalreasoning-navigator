import type { TopicV1 } from "@/types/topic";
import { useConsultation } from "@/context/ConsultationProvider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ReasoningTab } from "./ReasoningTab";
import { StructuredTab } from "@/components/structured/StructuredTab";

interface RightPaneProps {
  topic: TopicV1;
}

export function RightPane({ topic }: RightPaneProps) {
  const { state, dispatch } = useConsultation();

  return (
    <div className="flex flex-col h-full bg-card">
      <Tabs
        value={state.uiPrefs.rightPaneTab}
        onValueChange={(v) =>
          dispatch({ type: "SET_UI_PREF", key: "rightPaneTab", value: v })
        }
        className="flex flex-col h-full"
      >
        <div className="px-3 pt-2 border-b shrink-0">
          <TabsList className="h-8 w-full">
            <TabsTrigger value="reasoning" className="flex-1 text-xs">
              Reasoning
            </TabsTrigger>
            <TabsTrigger value="structured" className="flex-1 text-xs">
              Structured
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="reasoning" className="flex-1 overflow-y-auto m-0 p-0">
          <ReasoningTab topic={topic} />
        </TabsContent>

        <TabsContent value="structured" className="flex-1 overflow-y-auto m-0 p-0">
          <StructuredTab topic={topic} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
