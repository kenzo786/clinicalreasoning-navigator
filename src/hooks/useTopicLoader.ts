import { useState, useEffect, useCallback } from "react";
import type { TopicV1 } from "@/types/topic";
import { loadTopic, AVAILABLE_TOPICS } from "@/lib/topicSchema";

export function useTopicLoader(topicId: string) {
  const [topic, setTopic] = useState<TopicV1 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const t = await loadTopic(id);
      setTopic(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load topic");
      setTopic(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(topicId);
  }, [topicId, load]);

  return { topic, loading, error, availableTopics: AVAILABLE_TOPICS, reload: () => load(topicId) };
}
