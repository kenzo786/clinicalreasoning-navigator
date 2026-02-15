import { useConsultation } from "@/context/ConsultationProvider";
import { BookOpen, Edit3, Brain } from "lucide-react";

export function MobileNav() {
  const { state, dispatch } = useConsultation();
  const active = state.uiPrefs.mobileActivePane;

  const tabs = [
    { id: "library" as const, label: "Library", icon: BookOpen },
    { id: "editor" as const, label: "Editor", icon: Edit3 },
    { id: "reasoning" as const, label: "Reason", icon: Brain },
  ];

  return (
    <nav className="flex items-center border-t bg-card shrink-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => dispatch({ type: "SET_UI_PREF", key: "mobileActivePane", value: tab.id })}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
            active === tab.id
              ? "text-primary font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <tab.icon className="h-4 w-4" />
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
