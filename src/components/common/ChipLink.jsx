import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function ChipLink({ to = "#", label = "" }) {
    return (
        <Link to={to} className="p-1 px-2 text-xs bg-indigo-200 text-black rounded-full inline-flex items-center gap-1 hover:bg-indigo-300 transition">
            {label}
            <ChevronRight size={12} />
        </Link>
    );
}