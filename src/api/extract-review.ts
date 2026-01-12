import { invokeCommand } from "../lib/tauri";
import type { Extract } from "./extracts";
import type { LearningItem } from "./learning-items";

/**
 * Submit a review for an extract
 * @param extractId The ID of the extract being reviewed
 * @param rating 1=Again, 2=Hard, 3=Good, 4=Easy
 * @param timeTaken Time taken in milliseconds
 */
export async function submitExtractReview(
    extractId: string,
    rating: number,
    timeTaken: number
): Promise<Extract> {
    return await invokeCommand<Extract>("submit_extract_review", {
        extractId,
        rating,
        timeTaken,
    });
}

/**
 * Create a cloze deletion flashcard from an extract
 */
export async function createClozeFromExtract(
    extractId: string,
    clozeText: string,
    clozeRanges: [number, number][]
): Promise<LearningItem> {
    return await invokeCommand<LearningItem>("create_cloze_from_extract", {
        extractId,
        clozeText,
        clozeRanges,
    });
}

/**
 * Create a Q&A flashcard from an extract
 */
export async function createQAFromExtract(
    extractId: string,
    question: string,
    answer: string
): Promise<LearningItem> {
    return await invokeCommand<LearningItem>("create_qa_from_extract", {
        extractId,
        question,
        answer,
    });
}

/**
 * Get all due extracts (including new ones) from the queue logic
 * Note: This functionality is largely handled by the main get_queue command now,
 * but this helper is useful for specific extract-only views
 */
export async function getDueExtracts(): Promise<Extract[]> {
    return await invokeCommand<Extract[]>("get_reviewable_extracts");
}
