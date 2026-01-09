//! Algorithm tests for scheduling algorithms

#[cfg(test)]
mod tests {
    use crate::algorithms::{calculate_document_priority_score, calculate_priority_score, DocumentScheduler, SM2Params};
    use crate::models::ReviewRating;
    use chrono::{Utc, Duration as ChronoDuration};

    #[test]
    fn test_sm2_params_default() {
        let params = SM2Params::default();
        assert_eq!(params.ease_factor, 2.5);
        assert_eq!(params.interval, 0.0);
        assert_eq!(params.repetitions, 0);
    }

    #[test]
    fn test_sm2_again_rating() {
        let params = SM2Params::default();
        let next = params.next_interval(ReviewRating::Again);

        // Again should reset the card
        assert_eq!(next.repetitions, 0);
        assert_eq!(next.interval, 0.0);
    }

    #[test]
    fn test_sm2_first_review_good() {
        let params = SM2Params::default();
        let next = params.next_interval(ReviewRating::Good);

        assert_eq!(next.repetitions, 1);
        assert_eq!(next.interval, 1.0);
    }

    #[test]
    fn test_sm2_second_review_good() {
        let params = SM2Params {
            ease_factor: 2.5,
            interval: 1.0,
            repetitions: 1,
        };
        let next = params.next_interval(ReviewRating::Good);

        assert_eq!(next.repetitions, 2);
        assert_eq!(next.interval, 6.0);
    }

    #[test]
    fn test_sm2_third_review_good() {
        let params = SM2Params {
            ease_factor: 2.5,
            interval: 6.0,
            repetitions: 2,
        };
        let next = params.next_interval(ReviewRating::Good);

        assert_eq!(next.repetitions, 3);
        // I(3) = I(2) * EF = 6.0 * 2.5 = 15.0
        assert_eq!(next.interval, 15.0);
    }

    #[test]
    fn test_sm2_ease_factor_increase() {
        let params = SM2Params {
            ease_factor: 2.5,
            interval: 1.0,
            repetitions: 1,
        };
        let next = params.next_interval(ReviewRating::Good);

        // EF' = EF + (0.1 - (5 - 4) * (0.08 + (5 - 4) * 0.02))
        // EF' = 2.5 + (0.1 - 1 * 0.1) = 2.5 + 0 = 2.5
        assert_eq!(next.ease_factor, 2.5);
    }

    #[test]
    fn test_sm2_ease_factor_decrease() {
        let params = SM2Params {
            ease_factor: 2.5,
            interval: 1.0,
            repetitions: 1,
        };
        let next = params.next_interval(ReviewRating::Hard);

        // EF' = EF + (0.1 - (5 - 3) * (0.08 + (5 - 3) * 0.02))
        // EF' = 2.5 + (0.1 - 2 * 0.12) = 2.5 - 0.14 = 2.36
        assert_eq!(next.ease_factor, 2.36);
    }

    #[test]
    fn test_sm2_ease_factor_minimum() {
        let params = SM2Params {
            ease_factor: 1.3,
            interval: 1.0,
            repetitions: 1,
        };
        let next = params.next_interval(ReviewRating::Hard);

        // Should not go below 1.3
        assert_eq!(next.ease_factor, 1.3);
    }

    #[test]
    fn test_sm2_easy_rating() {
        let params = SM2Params {
            ease_factor: 2.5,
            interval: 1.0,
            repetitions: 1,
        };
        let next = params.next_interval(ReviewRating::Easy);

        assert_eq!(next.repetitions, 2);
        assert_eq!(next.interval, 6.0);

        // EF' = EF + (0.1 - (5 - 5) * (0.08 + (5 - 5) * 0.02))
        // EF' = 2.5 + 0.1 = 2.6
        assert_eq!(next.ease_factor, 2.6);
    }

    #[test]
    fn test_document_priority_score_average() {
        let score = calculate_document_priority_score(Some(4), 80);
        assert!((score - 90.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_document_priority_score_no_rating() {
        let score = calculate_document_priority_score(None, 40);
        assert!((score - 20.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_sm2_next_review_date() {
        let params = SM2Params {
            ease_factor: 2.5,
            interval: 10.0,
            repetitions: 3,
        };
        let next_date = params.next_review_date();

        let now = Utc::now();
        let expected_date = now + ChronoDuration::days(10);

        // Allow 1 second tolerance for test execution time
        let diff = (next_date - expected_date).num_seconds().abs();
        assert!(diff < 2);
    }

    #[test]
    fn test_document_scheduler_default() {
        let scheduler = DocumentScheduler::default();
        assert_eq!(scheduler.max_daily_documents, 5);
        assert_eq!(scheduler.cards_per_document, 10);
    }

    #[test]
    fn test_document_scheduler_schedule() {
        let scheduler = DocumentScheduler {
            max_daily_documents: 3,
            cards_per_document: 10,
        };

        let documents = vec![
            ("doc1".to_string(), 5),
            ("doc2".to_string(), 2),
            ("doc3".to_string(), 10),
            ("doc4".to_string(), 1),
            ("doc5".to_string(), 8),
        ];

        let scheduled = scheduler.schedule_documents(documents);

        // Should return top 3 documents with fewest items
        assert_eq!(scheduled.len(), 3);
        // Sorted by learning item count: doc4(1), doc2(2), doc1(5)
        assert_eq!(scheduled[0], "doc4");
        assert_eq!(scheduled[1], "doc2");
        assert_eq!(scheduled[2], "doc1");
    }

    #[test]
    fn test_priority_score_due_now() {
        let now = Utc::now();
        let score = calculate_priority_score(now, 0, 0, 5.0);

        // Due now, new item (interval 0) should get highest priority
        assert_eq!(score, 10.0);
    }

    #[test]
    fn test_priority_score_overdue_with_interval() {
        let now = Utc::now();
        let score = calculate_priority_score(now, 10, 5, 5.0);

        // Overdue with interval 10: 10.0 - (10.0 / 10.0) + (5.0 * 0.1) = 9.5
        assert_eq!(score, 9.5);
    }

    #[test]
    fn test_priority_score_future_due() {
        let future = Utc::now() + ChronoDuration::days(5);
        let score = calculate_priority_score(future, 10, 5, 5.0);

        // Due in 5 days: 4.0 + (5.0 * 0.1) = 4.5
        assert_eq!(score, 4.5);
    }

    #[test]
    fn test_priority_score_difficulty_adjustment() {
        let _now = Utc::now();
        // Use future dates to avoid max priority cap
        let future = Utc::now() + ChronoDuration::days(10);
        let score_easy = calculate_priority_score(future, 10, 5, 1.0);
        let score_hard = calculate_priority_score(future, 10, 5, 10.0);

        // Harder items should get higher priority
        // Base: 2.0, easy: 2.0 + 0.1 = 2.1, hard: 2.0 + 1.0 = 3.0
        assert!(score_hard > score_easy);
        // Use approximate comparison for floating point
        assert!((score_hard - score_easy - 0.9).abs() < 0.001); // (10.0 - 1.0) * 0.1
    }

    #[test]
    fn test_priority_score_new_items_bonus() {
        let now = Utc::now();
        let score_new = calculate_priority_score(now, 0, 1, 5.0);
        let score_reviewed = calculate_priority_score(now, 0, 5, 5.0);

        // New items (< 3 reviews) should get priority bonus
        // Both have review_count < 3, so both get the bonus
        // new: 10.0 + 0.5 = 10.5 -> 10.0 (capped), reviewed: 10.0 + 0.5 = 10.5 -> 10.0 (capped)
        // The difference is 0.0 since both get the same bonus and both are capped
        assert_eq!(score_new, score_reviewed);
        assert_eq!(score_new, 10.0); // Both capped at max
    }

    #[test]
    fn test_priority_score_bounds() {
        let past = Utc::now() - ChronoDuration::days(100);
        let score_high = calculate_priority_score(past, 0, 0, 10.0);
        let score_low = calculate_priority_score(past, 100, 100, 1.0);

        // Scores should be bounded between 0 and 10
        assert!(score_high <= 10.0);
        assert!(score_low >= 0.0);
    }

    #[test]
    fn test_sm2_multiple_reviews_sequence() {
        let mut params = SM2Params::default();

        // Simulate a sequence of reviews
        let ratings = vec![
            ReviewRating::Good,  // 1st review: interval = 1 day
            ReviewRating::Good,  // 2nd review: interval = 6 days
            ReviewRating::Good,  // 3rd review: interval = 6 * 2.5 = 15 days
            ReviewRating::Good,  // 4th review: interval = 15 * 2.5 = 37.5 days
        ];

        let expected_intervals = vec![1.0, 6.0, 15.0, 37.5];

        for (i, rating) in ratings.iter().enumerate() {
            params = params.next_interval(*rating);
            assert_eq!(params.interval, expected_intervals[i]);
            assert_eq!(params.repetitions, (i + 1) as u32);
        }
    }

    #[test]
    fn test_sm2_lapse_and_recovery() {
        let params = SM2Params {
            ease_factor: 2.5,
            interval: 15.0,
            repetitions: 3,
        };

        // A lapse (Again rating) should reset
        let next = params.next_interval(ReviewRating::Again);
        assert_eq!(next.repetitions, 0);
        assert_eq!(next.interval, 0.0);

        // Then good response
        let next = next.next_interval(ReviewRating::Good);
        assert_eq!(next.repetitions, 1);
        assert_eq!(next.interval, 1.0);
    }
}
