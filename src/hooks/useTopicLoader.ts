import { useState, useEffect, useCallback } from "react";
import type { TopicRuntime } from "@/types/topic";
import { loadTopic, loadTopicManifest } from "@/lib/topicSchema";

export function useTopicLoader(topicId: string) {
  const [topic, setTopic] = useState<TopicRuntime | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableTopics, setAvailableTopics] = useState<Array<{ id: string; displayName: string }>>([]);

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

  useEffect(() => {
    let ignore = false;
    loadTopicManifest()
      .then((manifest) => {
        if (ignore) return;
        setAvailableTopics(manifest.map((m) => ({ id: m.id, displayName: m.displayName })));
      })
      .catch(() => {
        if (ignore) return;
        setAvailableTopics([]);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const topics = availableTopics.length
    ? availableTopics
    : topic
    ? [{ id: topic.metadata.id, displayName: topic.metadata.displayName }]
    : [];

  return {
    topic,
    loading,
    error,
    availableTopics: topics,
    reload: () => load(topicId),
  };
}
