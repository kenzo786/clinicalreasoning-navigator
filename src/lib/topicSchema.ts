import type { TopicV1 } from "@/types/topic";

export function validateTopic(data: unknown): { valid: true; topic: TopicV1 } | { valid: false; error: string } {
  if (!data || typeof data !== "object") return { valid: false, error: "Topic data is not an object" };

  const t = data as any;

  if (t.version !== "1.0") return { valid: false, error: `Invalid version: ${t.version}` };
  if (!t.metadata?.id || !t.metadata?.slug || !t.metadata?.displayName)
    return { valid: false, error: "Missing required metadata fields" };
  if (!Array.isArray(t.snippets)) return { valid: false, error: "snippets must be an array" };
  if (!t.reasoning) return { valid: false, error: "Missing reasoning section" };
  if (!Array.isArray(t.structuredFields)) return { valid: false, error: "structuredFields must be an array" };
  if (!t.outputTemplate?.sections) return { valid: false, error: "Missing outputTemplate.sections" };

  return { valid: true, topic: t as TopicV1 };
}

export async function loadTopic(slug: string): Promise<TopicV1> {
  const resp = await fetch(`/topics/${slug}.json`);
  if (!resp.ok) throw new Error(`Failed to load topic: ${slug} (${resp.status})`);
  const data = await resp.json();
  const result = validateTopic(data);
  if (!result.valid) throw new Error(`Invalid topic ${slug}: ${(result as { valid: false; error: string }).error}`);
  return (result as { valid: true; topic: TopicV1 }).topic;
}

export const AVAILABLE_TOPICS = [
  { id: "sore-throat", displayName: "Sore Throat" },
  { id: "uti", displayName: "UTI" },
  { id: "low-back-pain", displayName: "Low Back Pain" },
];
