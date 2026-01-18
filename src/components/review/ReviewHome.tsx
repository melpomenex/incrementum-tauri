import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Compass, Layers, Plus, RefreshCw, Tag, Trash2, Zap } from "lucide-react";
import { useDocumentStore } from "../../stores/documentStore";
import { useReviewStore } from "../../stores/reviewStore";
import { useStudyDeckStore } from "../../stores/studyDeckStore";
import { getDueItems, type LearningItem } from "../../api/review";
import { filterByDeck, matchesDeckTags, normalizeTagList } from "../../utils/studyDecks";
import type { StudyDeck } from "../../types/study-decks";
import { deleteAllLearningItems } from "../../api/learning-items";

interface ReviewHomeProps {
  onStartReview: () => Promise<void>;
}

function toDateOnly(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function parseDueDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatMinutes(totalSeconds: number) {
  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));
  return `${totalMinutes} min`;
}

export function ReviewHome({ onStartReview }: ReviewHomeProps) {
  const { documents, loadDocuments } = useDocumentStore();
  const { loadStreak, streak, streakLoading } = useReviewStore();
  const {
    decks,
    activeDeckId,
    setActiveDeckId,
    addDeck,
    updateDeck,
    removeDeck,
    seedFromDocuments,
  } = useStudyDeckStore();

  const [dueItems, setDueItems] = useState<LearningItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckTags, setNewDeckTags] = useState("");

  const deckSectionRef = useRef<HTMLDivElement | null>(null);

  const activeDeck = useMemo(
    () => (decks || []).find((deck) => deck.id === activeDeckId) ?? null,
    [decks, activeDeckId]
  );

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (documents.length > 0) {
      seedFromDocuments(documents);
    }
  }, [documents, seedFromDocuments]);

  const loadStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await getDueItems();
      setDueItems(items);
      await loadStreak();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load review stats");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const scopedItems = useMemo(() => {
    return activeDeck ? filterByDeck(dueItems, activeDeck) : dueItems;
  }, [dueItems, activeDeck]);

  const today = toDateOnly(new Date());
  const dueToday = scopedItems.filter((item) => {
    const dueDate = parseDueDate(item.due_date);
    return dueDate ? toDateOnly(dueDate) <= today : true;
  });

  const newCount = scopedItems.filter((item) => item.state === "new").length;
  const learningCount = scopedItems.filter((item) => item.state === "learning" || item.state === "relearning").length;
  const reviewCount = scopedItems.filter((item) => item.state === "review").length;

  const estimatedSeconds = scopedItems.length * 30;

  const deckStats = useMemo(() => {
    return (decks || []).map((deck) => ({
      deck,
      count: dueItems.filter((item) => matchesDeckTags(item.tags ?? [], deck)).length,
    }));
  }, [decks, dueItems]);

  const handleAddDeck = () => {
    const name = newDeckName.trim();
    if (!name) return;
    const tags = normalizeTagList(newDeckTags.split(",").map((tag) => tag.trim()));
    addDeck(name, tags.length > 0 ? tags : [name]);
    setNewDeckName("");
    setNewDeckTags("");
  };

  const handleAddTag = (deck: StudyDeck, tag: string) => {
    const nextTags = normalizeTagList([...deck.tagFilters, tag]);
    updateDeck(deck.id, { tagFilters: nextTags });
  };

  const handleRemoveTag = (deck: StudyDeck, tag: string) => {
    const nextTags = deck.tagFilters.filter((t) => t !== tag);
    updateDeck(deck.id, { tagFilters: nextTags });
  };

  const handleResetAllCards = async () => {
    if (scopedItems.length === 0) {
      alert("There are no learning cards to delete.");
      return;
    }

    const confirmMessage = `Are you sure you want to DELETE ALL ${scopedItems.length} learning cards? This will permanently remove all flashcards and learning items from your entire collection. This action CANNOT be undone!\n\nType "DELETE ALL" to confirm.`;
    const userInput = prompt(confirmMessage);

    if (userInput !== "DELETE ALL") {
      return;
    }

    try {
      await deleteAllLearningItems();
      setDueItems([]);
      alert("All learning cards have been successfully deleted. You can now start fresh!");
      await loadStats();
    } catch (err) {
      alert(`Failed to delete all cards: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Review</h1>
              <p className="text-muted-foreground">
                Choose a deck and dive into focused sessions with clarity.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => deckSectionRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
              >
                <Layers className="h-4 w-4" />
                View Decks
              </button>
              <button
                onClick={loadStats}
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              {scopedItems.length > 0 && (
                <button
                  onClick={handleResetAllCards}
                  className="inline-flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive hover:bg-destructive/20"
                  title="Delete all learning cards and start over"
                >
                  <Trash2 className="h-4 w-4" />
                  Reset All
                </button>
              )}
              <button
                onClick={onStartReview}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                <Zap className="h-4 w-4" />
                Start Review
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveDeckId(null)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                !activeDeck ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              All Decks
            </button>
            {decks?.map((deck) => (
              <button
                key={deck.id}
                onClick={() => setActiveDeckId(deck.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  activeDeckId === deck.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {deck.name}
              </button>
            ))}
          </div>

          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {isLoading && (
            <div className="text-xs text-muted-foreground">Refreshing review stats...</div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                <span>Total Due</span>
                <BarChart3 className="h-4 w-4" />
              </div>
              <div className="mt-2 text-3xl font-semibold text-foreground">{scopedItems.length}</div>
              <p className="mt-1 text-xs text-muted-foreground">Across flashcards and learning items</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                <span>Due Today</span>
                <Compass className="h-4 w-4" />
              </div>
              <div className="mt-2 text-3xl font-semibold text-foreground">{dueToday.length}</div>
              <p className="mt-1 text-xs text-muted-foreground">Ready to tackle right now</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                <span>New vs Review</span>
                <Layers className="h-4 w-4" />
              </div>
              <div className="mt-2 text-lg font-semibold text-foreground">
                {newCount} new · {learningCount} learning · {reviewCount} review
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Balanced workload snapshot</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                <span>Estimated Time</span>
                <Zap className="h-4 w-4" />
              </div>
              <div className="mt-2 text-3xl font-semibold text-foreground">{formatMinutes(estimatedSeconds)}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Streak: {streakLoading ? "..." : streak?.current_streak ?? 0} days · Longest:{" "}
                {streakLoading ? "..." : streak?.longest_streak ?? 0} days
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Total reviews: {streakLoading ? "..." : streak?.total_reviews ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div ref={deckSectionRef} className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Decks</h2>
                <p className="text-sm text-muted-foreground">Pick a deck to focus your next session.</p>
              </div>
              <button
                onClick={() => setActiveDeckId(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Reset selection
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              {!decks || decks.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No decks yet. Import an Anki `.apkg` file or create a deck below.
                </div>
              )}
              {deckStats?.map(({ deck, count }) => (
                <button
                  key={deck.id}
                  onClick={() => setActiveDeckId(deck.id)}
                  className={`flex flex-col gap-2 rounded-lg border px-4 py-3 text-left transition-colors ${
                    activeDeckId === deck.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-foreground">{deck.name}</span>
                    <span className="text-xs text-muted-foreground">{count} due</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {deck.tagFilters.map((tag) => (
                      <span key={tag} className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Deck Tag Manager</h2>
                <p className="text-xs text-muted-foreground">
                  Add tags to match non-Anki items into each deck.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {!decks || decks.length === 0 && (
                <p className="text-sm text-muted-foreground">Create a deck to start tagging.</p>
              )}
              {decks?.map((deck) => (
                <div key={deck.id} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between">
                    <input
                      value={deck.name}
                      onChange={(e) => updateDeck(deck.id, { name: e.target.value })}
                      className="w-full bg-transparent text-sm font-semibold text-foreground outline-none"
                    />
                    <button
                      onClick={() => removeDeck(deck.id)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {deck.tagFilters.map((tag) => (
                      <button
                        key={`${deck.id}-${tag}`}
                        onClick={() => handleRemoveTag(deck, tag)}
                        className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Remove tag"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      placeholder="Add tag"
                      className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          const value = (event.target as HTMLInputElement).value.trim();
                          if (value.length > 0) {
                            handleAddTag(deck, value);
                            (event.target as HTMLInputElement).value = "";
                          }
                        }
                      }}
                    />
                    <button
                      onClick={(event) => {
                        const input = (event.currentTarget.previousElementSibling as HTMLInputElement | null);
                        if (!input) return;
                        const value = input.value.trim();
                        if (value.length === 0) return;
                        handleAddTag(deck, value);
                        input.value = "";
                      }}
                      className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-dashed border-border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Plus className="h-3 w-3" />
                Create a new deck
              </div>
              <div className="mt-2 space-y-2">
                <input
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="Deck name"
                  className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                />
                <input
                  value={newDeckTags}
                  onChange={(e) => setNewDeckTags(e.target.value)}
                  placeholder="Tags (comma separated)"
                  className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                />
                <button
                  onClick={handleAddDeck}
                  className="w-full rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90"
                >
                  Create deck
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
