import { Link, useNavigate, useParams } from "react-router-dom";
import dbService from "../../lib/dbService.js";
import { useEffect, useState } from "react";

export default function PageRedirect() {
    const { pageId } = useParams();
    const [showNotFound, setShowNotFound] = useState(false);
    const navigate = useNavigate();

    const getPage = async () => {
        const page = await dbService.getMeta(pageId);
        if (page && page.type !== 'workspace') {
            navigate(`/workspace/${page.rootId}/${page.id}`);
        } else {
            setShowNotFound(true);
        }
    }
    useEffect(() => {
        getPage();
    }, []);

    return (
        <div className="flex flex-col gap-3 items-center justify-center min-h-screen bg-white dark:bg-black text-gray-400">
            {showNotFound && (<>
                <p>Page not found!</p>
                <Link className="btnSecondary flex items-center" to="/workspace">
                    Go to Workspaces
                </Link></>
            )}
        </div>
    );
}