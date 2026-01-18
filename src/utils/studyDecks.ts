import type { StudyDeck } from "../types/study-decks";

const normalize = (value: string) => value.trim().toLowerCase();

export function normalizeTagList(tags: string[]): string[] {
  const seen = new Map<string, string>();
  for (const tag of tags) {
    const trimmed = tag.trim();
    if (!trimmed) continue;
    const key = normalize(trimmed);
    if (!seen.has(key)) {
      seen.set(key, trimmed);
    }
  }
  return Array.from(seen.values());
}

export function matchesDeckTags(tags: string[], deck: StudyDeck | null): boolean {
  if (!deck) return true;
  if (!tags || tags.length === 0) return false;
  if (!deck.tagFilters || deck.tagFilters.length === 0) return false;

  const tagSet = new Set(tags.map((tag) => normalize(tag)));
  for (const filter of deck.tagFilters) {
    if (tagSet.has(normalize(filter))) {
      return true;
    }
  }
  return false;
}

export function filterByDeck<T extends { tags: string[] }>(items: T[], deck: StudyDeck | null): T[] {
  if (!deck) return items;
  return items.filter((item) => matchesDeckTags(item.tags, deck));
}

export function getDeckTagCandidates(tags: string[]): string[] {
  return tags
    .filter((tag) => tag && tag.trim().length > 0)
    .filter((tag) => normalize(tag) !== "anki-import")
    .map((tag) => tag.trim());
}
