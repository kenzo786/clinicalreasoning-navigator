import { useConsultation } from "@/context/ConsultationProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function RestoreModal() {
  const { hasPrefsBackup, restorePrefsBackup, discardPrefsBackup } = useConsultation();

  if (!hasPrefsBackup) return null;

  return (
    <Dialog open onOpenChange={(v) => !v && discardPrefsBackup()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Restore saved workspace preferences?</DialogTitle>
          <DialogDescription>
            Saved layout and workflow preferences were found. Restore them or start with defaults.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={discardPrefsBackup}>
            Discard
          </Button>
          <Button onClick={restorePrefsBackup}>
            Restore
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
