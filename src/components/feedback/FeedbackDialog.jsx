import { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { useSupabaseAuth } from '../../layouts/auth/SupabaseAuthProvider';
import { useNavigate } from 'react-router-dom';

const FeedbackDialog = ({ isOpen, onClose, template, onSubmit }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [responses, setResponses] = useState({});
    const [errors, setErrors] = useState({});
    const { user } = useSupabaseAuth();
    const navigate = useNavigate();
    const currentQuestion = template.questions[currentStep];
    const isLastStep = currentStep === template.questions.length - 1;

    // Sanitize input to prevent XSS and trim whitespace
    const sanitizeInput = (input) => {
        if (typeof input !== 'string') return input;
        return input
            .trim()
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .slice(0, 1000); // Limit length
    };

    // Validate current step
    const validateStep = () => {
        const question = currentQuestion;

        // If the question is skippable and user hasn't interacted, allow skip
        if (question.skippable && !responses[question.id]) {
            return true;
        }

        // If question is required and has no response
        if (question.required && !responses[question.id]) {
            setErrors({ [question.id]: 'This field is required' });
            return false;
        }

        // Validate based on field type
        if (question.type === 'rating' && responses[question.id]) {
            const rating = responses[question.id].rating;
            if (rating && (rating < question.min || rating > question.max)) {
                setErrors({ [question.id]: `Rating must be between ${question.min} and ${question.max}` });
                return false;
            }
        }

        setErrors({});
        return true;
    };

    const handleNext = () => {
        if (!validateStep()) return;

        if (isLastStep) {
            handleSubmit();
        } else {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        setErrors({});
        setCurrentStep(currentStep - 1);
    };

    const handleSkip = () => {
        // Mark as skipped
        setResponses({
            ...responses,
            [currentQuestion.id]: { skipped: true }
        });
        setErrors({});

        if (isLastStep) {
            handleSubmit();
        } else {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleSubmit = () => {
        // Compile final sanitized JSON
        const sanitizedResponses = {};

        template.questions.forEach(question => {
            const response = responses[question.id];

            if (!response) {
                sanitizedResponses[question.id] = { skipped: true };
                return;
            }

            if (response.skipped) {
                sanitizedResponses[question.id] = { skipped: true };
                return;
            }

            // Sanitize based on type
            if (question.type === 'rating-with-comment' || question.type === 'rating') {
                sanitizedResponses[question.id] = {
                    rating: response.rating,
                    ...(response.comment && { comment: sanitizeInput(response.comment) })
                };
            } else if (question.type === 'text') {
                sanitizedResponses[question.id] = {
                    text: sanitizeInput(response.text)
                };
            }
        });

        const finalResponse = {
            templateId: template.id,
            templateVersion: template.version,
            completedAt: new Date().toISOString(),
            responses: sanitizedResponses
        };

        onSubmit(finalResponse);
        handleClose();
    };

    const handleClose = () => {
        setCurrentStep(0);
        setResponses({});
        setErrors({});
        onClose();
    };

    const updateResponse = (questionId, value) => {
        setResponses({
            ...responses,
            [questionId]: value
        });
        setErrors({});
    };

    const renderQuestion = () => {
        const question = currentQuestion;
        const response = responses[question.id] || {};

        switch (question.type) {
            case 'rating-with-comment':
                return (
                    <div className="flex gap-4 flex-col">
                        <div className="flex gap-2">
                            {Array.from({ length: question.max - question.min + 1 }, (_, i) => {
                                const value = question.min + i;
                                return (
                                    <button
                                        key={value}
                                        onClick={() => updateResponse(question.id, { ...response, rating: value })}
                                        className={`w-full h-10 rounded-2xl font-semibold transition-all ${response.rating === value
                                            ? 'bg-indigo-500 rounded-3xl'
                                            : 'bg-slate-500/40'
                                            }`}
                                    >
                                        {value}
                                    </button>
                                );
                            })}
                        </div>
                        <div>
                            <label className="textLabel">
                                Additional Comments (Optional)
                            </label>
                            <textarea
                                value={response.comment || ''}
                                onChange={(e) => updateResponse(question.id, { ...response, comment: e.target.value })}
                                rows={4}
                                className="w-full mt-2 px-3 py-2 bg-slate-100 dark:bg-slate-500/20 text-black dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                placeholder="Share your thoughts..."
                            />
                        </div>
                    </div>
                );

            case 'rating':
                return (
                    <div className="flex gap-2">
                        {Array.from({ length: question.max - question.min + 1 }, (_, i) => {
                            const value = question.min + i;
                            return (
                                <button
                                    key={value}
                                    onClick={() => updateResponse(question.id, { rating: value })}
                                    className={`w-full h-10 rounded-2xl font-semibold transition-all ${response.rating === value
                                        ? 'bg-indigo-500 rounded-3xl'
                                        : 'bg-slate-500/40'
                                        }`}
                                >
                                    {value}
                                </button>
                            );
                        })}
                    </div>
                );

            case 'text':
                return (
                    <textarea
                        value={response.text || ''}
                        onChange={(e) => updateResponse(question.id, { text: e.target.value })}
                        rows={4}
                        className="w-full mt-2 px-3 py-2 bg-slate-100 dark:bg-slate-500/20 text-black dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder={question.placeholder || 'Type your answer...'}
                    />
                );

            default:
                return <div>Unknown question type</div>;
        }
    };

    return (
        <Dialog open={isOpen} as="div" className="relative z-50" onClose={handleClose}>
            <DialogBackdrop transition className="dialogBackdrop" />
            <div className="dialogWrapper">
                <DialogPanel
                    transition
                    className="dialogPanel"
                >
                    <DialogTitle
                        as="h3"
                        className="text-lg font-medium leading-6 text-gray-900"
                    >
                        {template.title}
                    </DialogTitle>

                    {user ? (
                        <>
                            <div className="my-6">
                                <div className="flex justify-between text-gray-600 mb-2">
                                    <span className='textLabel'>Question {currentStep + 1} of {template.questions.length}</span>
                                    <span>{Math.round(((currentStep + 1) / template.questions.length) * 100)}%</span>
                                </div>
                                <div className="w-full bg-black rounded-full h-2">
                                    <div
                                        className="bg-[#afffc7] h-2 rounded-sm transition-all duration-300"
                                        style={{ width: `${((currentStep + 1) / template.questions.length) * 100}%` }}
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <h4 className="textLabel mb-2">
                                    {currentQuestion.question}
                                    {currentQuestion.skippable && (
                                        <span className="text-sm text-gray-500 ml-2">(Optional)</span>
                                    )}
                                </h4>
                                {renderQuestion()}
                                {errors[currentQuestion.id] && (
                                    <p className="mt-2 text-sm text-red-600">{errors[currentQuestion.id]}</p>
                                )}
                            </div>

                            <div className="flex justify-between gap-3">
                                <button
                                    onClick={handleBack}
                                    disabled={currentStep === 0}
                                    className="btnSecondary w-fit"
                                >
                                    Back
                                </button>

                                <div className="flex gap-3">
                                    {currentQuestion.skippable && (
                                        <button
                                            onClick={handleSkip}
                                            className="btnPrimary"
                                        >
                                            Skip
                                        </button>
                                    )}
                                    <button
                                        onClick={handleNext}
                                        className="btnPrimary"
                                    >
                                        {isLastStep ? 'Submit' : 'Next'}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-3">
                            <p>You must be logged in to submit feedback</p>
                            <button
                                onClick={() => navigate('/settings/sync')}
                                className="btnPrimary"
                            >
                                Login
                            </button>
                        </div>
                    )}
                </DialogPanel>
            </div>
        </Dialog>
    );
};

export default FeedbackDialog;