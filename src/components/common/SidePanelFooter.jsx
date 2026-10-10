import DeletedFilesDialog from "../trash/DeletedFilesDialog";
import { Route } from "lucide-react";

export default function SidePanelFooter() {
    return (
        <div className="text-sm text-black dark:text-white font-medium pt-20 p-1">
            <DeletedFilesDialog />

            <div className="flex flex-col gap-1 mt-4">
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
                    <a href="https://github.com/project59/mintype/issues" className="btnChip">v2.0</a>
                </div>

            </div>
        </div>
    );
}