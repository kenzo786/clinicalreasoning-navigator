import type { OutputSection } from "@/types/topic";

export type ComposerLinkState =
  | "not_linked"
  | "linked_clean"
  | "linked_modified"
  | "linked_missing";

export type ComposerDisplayLinkState =
  | "Not inserted"
  | "Linked"
  | "Modified after insert"
  | "Link missing";

export type ComposerLinkStateTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger";

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
