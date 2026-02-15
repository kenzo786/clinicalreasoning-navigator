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
  const { hasAutosave, restoreAutosave, discardAutosave } = useConsultation();

  if (!hasAutosave) return null;

  return (
    <Dialog open onOpenChange={(v) => !v && discardAutosave()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Restore previous draft?</DialogTitle>
          <DialogDescription>
            A previous autosaved draft was found. Would you like to restore it or start fresh?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={discardAutosave}>
            Discard
          </Button>
          <Button onClick={restoreAutosave}>
            Restore
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
