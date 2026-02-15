import type { OutputSection } from "@/types/topic";

export type ComposerLinkState =
  | "not_linked"
  | "linked_clean"
  | "linked_modified"
  | "linked_missing";

export interface ComposerSection {
  id: string;
  title: string;
  source: OutputSection["source"];
  content: string;
  contentHash: string;
  includeByDefault: boolean;
  included: boolean;
  linkState: ComposerLinkState;
}
