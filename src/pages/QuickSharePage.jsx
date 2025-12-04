import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import BasicElementRenderer from "../render/shared/read-only/BasicElementRenderer.jsx";
import ReadOnlyWhiteboard from "../render/whiteboard/components/ReadOnlyWhiteboard.jsx";
import { Home } from "lucide-react";
import ThemeToggleBtn from "../components/common/ThemeToggleBtn";
import { QuillProvider } from "../render/shared/RichTextToolbar.jsx";

export default function QuickSharePage() {
    const { pageId } = useParams();
    const [page, setPage] = useState(null);
    const [elements, setElements] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPage = async () => {
        setLoading(true);

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/get-quicksharepage/${pageId}`);
            if (!response.ok) {
                throw new Error("Page not found or expired");
            }
            const fetchedPage = await response.json();
            console.log("Quickshare page data:", fetchedPage);


            setPage(fetchedPage);

            setElements(fetchedPage.elements || []);


        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPage();
    }, [pageId]);

    if (loading) {
        return (
            <div className="flex flex-col gap-4 items-center justify-center min-h-screen text-black dark:text-white font-bold">
                <img src="/favicon.svg" className="h-8" alt="logo" />
                LOADING...
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center relative h-screen text-black overflow-auto bg-white dark:bg-[#1f1f2d]">
            <nav className="w-full z-20 flex items-center justify-between text-sm text-zinc-400 h-12 p-2.5 ">
                <div className="flex items-center gap-2">
                    <ThemeToggleBtn />
                    <Link to={`/${'workspace'}`} className=" hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:hover:text-gray-300 p-1 rounded-lg duration-200">
                        <Home size={14} />
                    </Link>
                </div>
            </nav>

        <QuillProvider>

            {page && (
                (page.type === "document" ? (
                    <div className="relative h-fit max-w-3xl px-3 w-full pt-16 pb-12 md:pt-16 md:pb-16">
                        <BasicElementRenderer elements={elements[0]} readOnly={true} />
                    </div>
                ) : (
                    <ReadOnlyWhiteboard
                    key={pageId}
                    preferences={page.preferences}
                    elements={elements}
                    onElementUpdate={() => { }}
                    onwrapperUpdate={() => { }}
                    onElementAdd={() => { }}
                    onElementDelete={() => { }}
                    handleTransformed={() => { }}
                    />
                ))
            )}
            </QuillProvider>
        </div>
    );
}