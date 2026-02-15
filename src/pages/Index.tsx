import { ConsultationProvider } from "@/context/ConsultationProvider";
import AppShell from "@/components/layout/AppShell";

const Index = () => {
  return (
    <ConsultationProvider>
      <AppShell />
    </ConsultationProvider>
  );
};

export default Index;
