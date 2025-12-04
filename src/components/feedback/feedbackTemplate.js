export const feedbackTemplate = {
    id: 'd831ffdd-f14e-4a2e-8095-54c97a7e907e',
    version: '1.0',
    title: 'Beta Testing v1.0 Feedback',
    questions: [
        {
            id: 'rich_text_rating',
            type: 'rating-with-comment',
            question: 'What do you rate the rich text component?',
            required: true,
            skippable: false,
            min: 1,
            max: 5
        },
        {
            id: 'ui_rating',
            type: 'rating-with-comment',
            question: 'What do you rate the UI?',
            required: true,
            skippable: false,
            min: 1,
            max: 5
        },
        {
            id: 'recommendation_likelihood',
            type: 'rating',
            question: 'How likely are you to recommend Mintype to a friend?',
            required: true,
            skippable: false,
            min: 1,
            max: 5
        },
        {
            id: 'feature_request',
            type: 'text',
            question: 'What is a feature you would like to be added?',
            required: true,
            skippable: false,
            placeholder: 'Describe the feature...'
        },
        {
            id: 'feature_dislike',
            type: 'text',
            question: 'What is a feature you dislike?',
            required: false,
            skippable: true,
            placeholder: 'Tell us what you dislike...'
        },
        {
            id: 'feature_enjoy',
            type: 'text',
            question: 'What is a feature you enjoy?',
            required: false,
            skippable: true,
            placeholder: 'Tell us what you enjoy...'
        },
        {
            id: 'overall_rating',
            type: 'rating',
            question: 'Overall, what would you rate this app?',
            required: true,
            skippable: false,
            min: 1,
            max: 5
        }
    ]
};