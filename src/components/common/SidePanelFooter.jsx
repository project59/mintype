import { useState } from "react";
import FeedbackDialog from "../feedback/FeedbackDialog";
import { feedbackTemplate } from "../feedback/feedbackTemplate";
import { useSupabaseAuth } from "../../layouts/auth/SupabaseAuthProvider.jsx";
import DeletedFilesDialog from "../trash/DeletedFilesDialog";
import { Route } from "lucide-react";

export default function SidePanelFooter() {
    const [isOpen, setIsOpen] = useState(false);
    const { accessToken } = useSupabaseAuth();

    const handleFeedbackSubmit = async (feedbackData) => {
        console.log('Feedback submitted:', feedbackData);

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/send-feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    formId: 'd831ffdd-f14e-4a2e-8095-54c97a7e907e', // Get this from your feedback_forms table
                    response: feedbackData
                })
            });

            if (response.ok) {
                console.log('Feedback sent successfully!');
            }
        } catch (error) {
            console.error('Error sending feedback:', error);
        }
    };
    return (
        <div className="text-sm text-black dark:text-white font-medium pt-20 p-1">
            <DeletedFilesDialog />

            <div className="flex flex-col gap-1 mt-4">
                <a href="https://community.mintype.app" className="flex flex-col gap-1 infoBox">
                    <h4 className="font-semibold">Mintype Community pages are out!</h4>
                    Share your ideas, get feedback, and view developer updates 🤓
                </a>

                <div className="flex gap-1">
                    <a title="Github" className="btnChip !p-1" href="https://github.com/project59/mintype">
                        <img className="w-4" src="https://images.seeklogo.com/logo-png/50/2/github-icon-logo-png_seeklogo-503247.png" alt="github-logo" />
                    </a>
                    <a title="Discord" className="btnChip !p-1" href="https://discord.gg/JyJH5seZqj">
                        <img className="w-4" src="https://img.icons8.com/color/512/discord-logo.png" alt="discord-logo" />
                    </a>
                    <a title="Github Roadmap" className="btnChip !p-1 !w-6 flex items-center justify-center" href="https://github.com/orgs/project59/projects/1">
                        <Route className="text-emerald-400" size={12} />
                    </a>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setIsOpen(true)}
                            className="btnChip"
                        >
                            Give Feedback
                        </button>
                        <a href="https://github.com/project59/mintype/issues" className="btnChip">beta 0.54</a>
                    </div>
                </div>

            </div>
            <FeedbackDialog
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                template={feedbackTemplate}
                onSubmit={handleFeedbackSubmit}
            />
        </div>
    );
}