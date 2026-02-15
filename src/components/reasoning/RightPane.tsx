import { useState } from "react";
import type { TopicRuntime, JitlContextType } from "@/types/topic";
import { useConsultation } from "@/context/ConsultationProvider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StructuredTab } from "@/components/structured/StructuredTab";
import { ReviewTab } from "@/components/review/ReviewTab";
import { ReasonTab } from "@/components/reasoning/ReasonTab";
import { JitlModal } from "@/components/jitl/JitlModal";

interface RightPaneProps {
  topic: TopicRuntime;
  onPromoteToEditor: (title: string, text: string) => void;
}

export function RightPane({ topic, onPromoteToEditor }: RightPaneProps) {
  const { state, dispatch } = useConsultation();
  const reviewEnabled = state.featureFlags.reviewEnabled && state.featureFlags.reviewJitl;
  const jitlEnabled = state.featureFlags.jitlEnabled && state.featureFlags.reviewJitl;
  const [jitlState, setJitlState] = useState<{
    open: boolean;
    term: string;
    contextType: JitlContextType;
  }>({
    open: false,
    term: "",
    contextType: "title",
  });

  const openJitl = (term: string, contextType: JitlContextType) => {
    setJitlState({
      open: true,
      term,
      contextType,
    });
  };

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
            {reviewEnabled && (
              <TabsTrigger value="review" className="flex-1 text-xs">
                Review
              </TabsTrigger>
            )}
            <TabsTrigger value="reason" className="flex-1 text-xs">
              Reason
            </TabsTrigger>
            <TabsTrigger value="structured" className="flex-1 text-xs">
              Structured
            </TabsTrigger>
          </TabsList>
        </div>

        {reviewEnabled && (
          <TabsContent value="review" className="flex-1 overflow-y-auto m-0 p-0">
            <ReviewTab topic={topic} onPromote={onPromoteToEditor} onOpenJitl={openJitl} />
          </TabsContent>
        )}

        <TabsContent value="reason" className="flex-1 overflow-y-auto m-0 p-0">
          <ReasonTab topic={topic} onPromote={onPromoteToEditor} onOpenJitl={openJitl} />
        </TabsContent>

        <TabsContent value="structured" className="flex-1 overflow-y-auto m-0 p-0">
          <StructuredTab topic={topic} />
        </TabsContent>
      </Tabs>

      {jitlEnabled && (
        <JitlModal
          open={jitlState.open}
          onClose={() => setJitlState((prev) => ({ ...prev, open: false }))}
          term={jitlState.term}
          initialContextType={jitlState.contextType}
          config={topic.jitl}
          onOutbound={(provider) => {
            dispatch({
              type: "ADD_JITL_OUTBOUND_EVENT",
              event: {
                term: jitlState.term,
                contextType: jitlState.contextType,
                provider,
                timestamp: Date.now(),
              },
            });
          }}
        />
      )}
    </div>
  );
}
