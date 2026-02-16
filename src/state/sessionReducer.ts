import type {
  ConsultationSessionState,
  EditorAnchor,
  EvidenceEntry,
  SessionAction,
} from "@/types/consultation";
import { DEFAULT_CONSULTATION_SESSION_STATE } from "@/types/consultation";
import { findAnchorMatch, hashString } from "@/lib/editorBridge";

const MAX_EDITOR_HISTORY = 50;

function recomputeAnchorDetachState(
  text: string,
  anchors: Record<string, EditorAnchor>
): Record<string, EditorAnchor> {
  const next: Record<string, EditorAnchor> = {};
  for (const [sectionId, anchor] of Object.entries(anchors)) {
    const match = findAnchorMatch(text, anchor);
    if (!match) {
      next[sectionId] = { ...anchor, detached: true };
      continue;
    }
    next[sectionId] = {
      ...anchor,
      detached: hashString(match.body) !== anchor.lastHash,
      lastKnownIndex: match.start,
    };
  }
  return next;
}

function setEditorText(
  state: ConsultationSessionState,
  nextText: string,
  withHistory: boolean
): ConsultationSessionState {
  if (state.editorText === nextText) return state;
  const nextAnchors = recomputeAnchorDetachState(nextText, state.editorAnchors);
  if (!withHistory) {
    return {
      ...state,
      editorText: nextText,
      editorAnchors: nextAnchors,
      editorHistory: {
        past: [],
        future: [],
      },
    };
  }
  const nextPast = [...state.editorHistory.past, state.editorText].slice(
    -MAX_EDITOR_HISTORY
  );
  return {
    ...state,
    editorText: nextText,
    editorAnchors: nextAnchors,
    editorHistory: {
      past: nextPast,
      future: [],
    },
  };
}

function upsertEvidence(
  entries: EvidenceEntry[],
  diagnosis: string,
  item: string,
  selected: boolean
): EvidenceEntry[] {
  const existing = entries.find((e) => e.diagnosis === diagnosis);
  if (!existing) {
    if (!selected) return entries;
    return [...entries, { diagnosis, items: [item] }];
  }

  const hasItem = existing.items.includes(item);
  if (selected && hasItem) return entries;
  if (!selected && !hasItem) return entries;

  const nextItems = selected
    ? [...existing.items, item]
    : existing.items.filter((x) => x !== item);

  if (nextItems.length === 0) {
    return entries.filter((e) => e.diagnosis !== diagnosis);
  }

  return entries.map((e) => (e.diagnosis === diagnosis ? { ...e, items: nextItems } : e));
}

export function sessionReducer(
  state: ConsultationSessionState,
  action: SessionAction
): ConsultationSessionState {
  switch (action.type) {
    case "SET_TOPIC":
      if (state.activeTopicId === action.topicId) return state;
      return {
        ...DEFAULT_CONSULTATION_SESSION_STATE,
        activeTopicId: action.topicId,
      };
    case "SET_EDITOR_TEXT":
      return setEditorText(state, action.text, false);
    case "SET_EDITOR_TEXT_WITH_HISTORY":
      return setEditorText(state, action.text, true);
    case "UNDO_EDITOR_TEXT": {
      if (state.editorHistory.past.length === 0) return state;
      const nextPast = [...state.editorHistory.past];
      const previous = nextPast.pop();
      if (previous === undefined) return state;
      return {
        ...state,
        editorText: previous,
        editorAnchors: recomputeAnchorDetachState(previous, state.editorAnchors),
        editorHistory: {
          past: nextPast,
          future: [state.editorText, ...state.editorHistory.future].slice(
            0,
            MAX_EDITOR_HISTORY
          ),
        },
      };
    }
    case "REDO_EDITOR_TEXT": {
      if (state.editorHistory.future.length === 0) return state;
      const [nextText, ...remainingFuture] = state.editorHistory.future;
      return {
        ...state,
        editorText: nextText,
        editorAnchors: recomputeAnchorDetachState(nextText, state.editorAnchors),
        editorHistory: {
          past: [...state.editorHistory.past, state.editorText].slice(
            -MAX_EDITOR_HISTORY
          ),
          future: remainingFuture,
        },
      };
    }
    case "SET_STRUCTURED_RESPONSE":
      return {
        ...state,
        structuredResponses: {
          ...state.structuredResponses,
          [action.fieldId]: action.value,
        },
      };
    case "SET_STRUCTURED_SECTION_DEFAULTS":
      return {
        ...state,
        structuredResponses: { ...action.values, ...state.structuredResponses },
      };
    case "TOGGLE_RED_FLAG": {
      const current = state.reasoningChecks.redFlagsConfirmed[action.flagId] ?? false;
      return {
        ...state,
        reasoningChecks: {
          ...state.reasoningChecks,
          redFlagsConfirmed: {
            ...state.reasoningChecks.redFlagsConfirmed,
            [action.flagId]: !current,
          },
        },
      };
    }
    case "TOGGLE_SECTION_INCLUSION": {
      const current = state.sectionInclusions[action.sectionId] ?? true;
      return {
        ...state,
        sectionInclusions: { ...state.sectionInclusions, [action.sectionId]: !current },
      };
    }
    case "ADD_RECENT_INSERT":
      return {
        ...state,
        recentInserts: [
          { snippetId: action.snippetId, timestamp: Date.now() },
          ...state.recentInserts.slice(0, 9),
        ],
      };
    case "SET_EXPORT_DRAFT": {
      if (action.text === null) {
        return {
          ...state,
          exportDraft: {
            text: "",
            isDerived: true,
            updatedAt: Date.now(),
            lastDerivedHash: action.derivedHash ?? null,
          },
        };
      }
      return {
        ...state,
        exportDraft: {
          text: action.text,
          isDerived: false,
          updatedAt: Date.now(),
          lastDerivedHash: state.exportDraft.lastDerivedHash,
        },
      };
    }
    case "SET_OUTPUT_OVERRIDE":
      if (action.text === null) {
        return {
          ...state,
          exportDraft: {
            text: "",
            isDerived: true,
            updatedAt: Date.now(),
            lastDerivedHash: state.exportDraft.lastDerivedHash,
          },
        };
      }
      return {
        ...state,
        exportDraft: {
          text: action.text,
          isDerived: false,
          updatedAt: Date.now(),
          lastDerivedHash: state.exportDraft.lastDerivedHash,
        },
      };
    case "TOGGLE_REVIEW_SECTION": {
      const current = action.expanded ?? (state.reviewUi.expandedSections[action.sectionId] ?? true);
      return {
        ...state,
        reviewUi: {
          ...state.reviewUi,
          expandedSections: {
            ...state.reviewUi.expandedSections,
            [action.sectionId]: !current,
          },
        },
      };
    }
    case "DDX_TOGGLE_DIAGNOSIS": {
      const exists = state.ddx.workingDiagnoses.some((d) => d.name === action.name);
      if (exists) {
        return {
          ...state,
          ddx: {
            ...state.ddx,
            workingDiagnoses: state.ddx.workingDiagnoses.filter((d) => d.name !== action.name),
            evidenceFor: state.ddx.evidenceFor.filter((e) => e.diagnosis !== action.name),
            evidenceAgainst: state.ddx.evidenceAgainst.filter((e) => e.diagnosis !== action.name),
            compareSelection: state.ddx.compareSelection.filter((name) => name !== action.name),
          },
        };
      }
      return {
        ...state,
        ddx: {
          ...state.ddx,
          workingDiagnoses: [
            ...state.ddx.workingDiagnoses,
            { name: action.name, isPrimary: false },
          ],
        },
      };
    }
    case "DDX_SET_PRIMARY":
      return {
        ...state,
        ddx: {
          ...state.ddx,
          workingDiagnoses: state.ddx.workingDiagnoses.map((d) => ({
            ...d,
            isPrimary: d.name === action.name,
          })),
        },
      };
    case "DDX_REORDER": {
      const next = [...state.ddx.workingDiagnoses];
      if (
        action.from < 0 ||
        action.to < 0 ||
        action.from >= next.length ||
        action.to >= next.length ||
        action.from === action.to
      ) {
        return state;
      }
      const [dragged] = next.splice(action.from, 1);
      next.splice(action.to, 0, dragged);
      return {
        ...state,
        ddx: {
          ...state.ddx,
          workingDiagnoses: next,
        },
      };
    }
    case "DDX_ADD_CUSTOM": {
      const name = action.name.trim();
      if (!name) return state;
      if (state.ddx.workingDiagnoses.some((d) => d.name === name)) return state;
      return {
        ...state,
        ddx: {
          ...state.ddx,
          workingDiagnoses: [...state.ddx.workingDiagnoses, { name, isPrimary: false }],
        },
      };
    }
    case "DDX_REMOVE":
      return {
        ...state,
        ddx: {
          ...state.ddx,
          workingDiagnoses: state.ddx.workingDiagnoses.filter((d) => d.name !== action.name),
          evidenceFor: state.ddx.evidenceFor.filter((e) => e.diagnosis !== action.name),
          evidenceAgainst: state.ddx.evidenceAgainst.filter((e) => e.diagnosis !== action.name),
          compareSelection: state.ddx.compareSelection.filter((name) => name !== action.name),
        },
      };
    case "DDX_TOGGLE_COMPARE": {
      const current = state.ddx.compareSelection;
      let next: string[];
      if (current.includes(action.name)) {
        next = current.filter((n) => n !== action.name);
      } else if (current.length >= 2) {
        next = [current[1], action.name];
      } else {
        next = [...current, action.name];
      }
      return {
        ...state,
        ddx: {
          ...state.ddx,
          compareSelection: next,
        },
      };
    }
    case "DDX_ASSIGN_EVIDENCE": {
      const nextFor =
        action.side === "for"
          ? upsertEvidence(state.ddx.evidenceFor, action.diagnosis, action.item, action.selected)
          : upsertEvidence(state.ddx.evidenceFor, action.diagnosis, action.item, false);
      const nextAgainst =
        action.side === "against"
          ? upsertEvidence(
              state.ddx.evidenceAgainst,
              action.diagnosis,
              action.item,
              action.selected
            )
          : upsertEvidence(state.ddx.evidenceAgainst, action.diagnosis, action.item, false);
      return {
        ...state,
        ddx: {
          ...state.ddx,
          evidenceFor: nextFor,
          evidenceAgainst: nextAgainst,
        },
      };
    }
    case "SET_EDITOR_ANCHOR":
      return {
        ...state,
        editorAnchors: {
          ...state.editorAnchors,
          [action.sectionId]: action.anchor,
        },
      };
    case "MARK_EDITOR_ANCHOR_DETACHED": {
      const anchor = state.editorAnchors[action.sectionId];
      if (!anchor) return state;
      return {
        ...state,
        editorAnchors: {
          ...state.editorAnchors,
          [action.sectionId]: { ...anchor, detached: true },
        },
      };
    }
    case "REMOVE_EDITOR_ANCHOR": {
      const next = { ...state.editorAnchors };
      delete next[action.sectionId];
      return { ...state, editorAnchors: next };
    }
    case "SET_REVIEW_ITEM_STATUS":
      return {
        ...state,
        reviewChecklist: {
          ...state.reviewChecklist,
          [action.id]: {
            id: action.id,
            source: action.source,
            status: action.status,
          },
        },
      };
    case "ADD_JITL_OUTBOUND_EVENT":
      return {
        ...state,
        jitlSession: {
          outboundEvents: [action.event, ...state.jitlSession.outboundEvents].slice(0, 50),
        },
      };
    case "RESET_SESSION":
      return {
        ...DEFAULT_CONSULTATION_SESSION_STATE,
        activeTopicId: state.activeTopicId,
      };
    default:
      return state;
  }
}
