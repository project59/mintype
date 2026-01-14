import { Link, useNavigate } from "react-router-dom";
import Carousel from "../layouts/homepage/Carousel.jsx";
import FeatCard from "../layouts/homepage/FeatCard.jsx";
import ChipLink from "../components/common/ChipLink.jsx";
import { useEffect } from "react";
import { getItem } from "../layouts/secure-context/dbUtils.js";
import ThemeToggleBtn from "../components/common/ThemeToggleBtn.jsx";
import { ArrowRight } from "lucide-react";
import ThemedSvg from "../components/common/ThemedSvg.jsx";

export default function DefaultHome() {
    const navigate = useNavigate();
    const checkMk = async () => {
        const mk = await getItem("master_key_enc");
        if (mk) {
            navigate("/workspace");
        }
    }
    // redirect to password entry on startup if an existing key is present
    useEffect(() => {
        if (!import.meta.env.DEV) {
            checkMk();
        }
    }, []);

    const slides = [
        {
            title: "Mindmaps",
            image: "/screenshots/intro.png",
            text: "Organize your notes into mindmaps in the whiteboard.",
        },
        {
            title: "Pomodoro Timer",
            image: "/screenshots/pomodoro.png",
            text: "We have a built in Pomodoro timer to help you stay focused and take breaks as your work. It supports push notifications too.",
        },
        {
            title: "Annotate and Draw",
            image: "/screenshots/annotate.png",
            text: "Annotate your notes with drawings, images, text, shapes and more. Complete those maths graphs and physics diagrams without needing another app or paper to draw on. Whiteboard grids are also supported.",
        },
        {
            title: "Video and Notes",
            image: "/screenshots/notes-yt.png",
            text: "Watch youtube videos and take notes at the same time without having to constantly switch tabs.",
        },
        {
            title: "Rich Tables",
            image: "/screenshots/tables.png",
            text: "Yes, our tables have rich text support. You can finally place those images inside your tables.",
        },
        {
            title: "Comments",
            image: "/screenshots/comments.png",
            text: "A versatile commenting system with four comment types, threads and reactions.",
        },
        // {
        //     title: "Quick Share",
        //     image: "/screenshots/page-mindmap.png",
        //     text: "Quick share pages to others with a shareable link. Pages will automatically deleted after 24 hours.",
        // },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-[#10101e] text-gray-900">
            <header className="sticky top-0 bg-slate-100/90 dark:bg-[#10101e]/90 z-20 backdrop-blur-sm px-4">
                <nav className="flex items-center justify-between py-3 max-w-screen-lg mx-auto ">
                    <div className="flex items-center gap-2">
                        <img className="h-5" src="favicon.svg" alt="logo" />
                        <p className="font-semibold text-xl text-black dark:text-white">Mintype</p>
                    </div>
                    <div className="flex gap-1">
                        <a href="https://github.com/project59/mintype" className="text-xs rounded-full bg-blue-500 p-1 px-1.5 text-white font-medium">
                            beta v0.54
                        </a>
                        {/* <Link className="btnChip gap-1" to="#">
                            Install PWA
                            <ArrowDown size={12} />
                        </Link> */}
                        <ThemeToggleBtn />
                    </div>
                </nav>
            </header>
            {/* Hero */}
            <section className="flex selection:bg-teal-100 flex-col md:flex-row items-center justify-center py-24 gap-10 max-w-screen-lg mx-auto w-full px-4">
                <div className=" flex flex-col md:text-left w-full">
                    <h1 className="text-5xl md:text-6xl font-semibold mb-4">
                        A space for your best ideas.
                    </h1>
                    <p className="max-w-md pb-4 textRegular !text-base">
                        Mintype is a fast, local-first notes app with versatile note taking features and strong focus on privacy. <br />
                    </p>
                    <div className="flex gap-1">
                        <Link
                            to="/workspace"
                            className="btnPrimary flex items-center gap-1 group"
                        >
                            Enter Workspace
                            <ArrowRight className="group-hover:translate-x-1 duration-200" size={16} />
                        </Link>
                        {/* <a
                            href="https://github.com/your-repo"
                            className="btnSecondary flex items-center"
                        >
                            Sign In
                        </a> */}
                    </div>
                </div>
            </section>

            <section className="mb-2 rounded-2xl w-full md:max-w-screen-lg mx-auto flex flex-col gap-4 relative px-4">
                <div className="">
                    <h1 className="text-3xl font-semibold">
                        Core Features of Mintype
                    </h1>
                    <p className="pt-4 textRegular !text-base max-w-xl">
                        Mintype has been built with the personal user in mind. We know note taking is more than just typing words down.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 py-12">
                    <FeatCard img="offline" title="Offline Support" description="Mintype is fully functional without internet. All notes are stored locally" />
                    <FeatCard img="secure" title="Secure Storage" description="Extra security never hurts. Notes are encrypted locally and in Google Drive with your password" />
                    <FeatCard img="storage" title="No Limits" description="No limits to the number of workspaces or pages. Store as much as your device can handle" />
                    <FeatCard img="drive-sync" title="Free Cloud Sync" description="Sync your notes to Google Drive free of charge. Easy setup and multi-device support is built in" />
                    <FeatCard img="rich-text" title="Beautiful Documents" description="Create rich documents with familiar block style editing and text formatting" />
                    <FeatCard img="rich-whiteboard" title="Rich Whiteboards" description="All blocks are supported in whiteboards, plus drawing, shapes and backgrounds" />
                    <FeatCard img="work-fast" title="Work Fast" description="Skip app start and network load times, Mintype stores everything on your device for fast access" />
                    <FeatCard img="community" title="Community Features" description="Features to help you get the most out of your notes are coming soon!" />
                </div>

            </section>

            {/* Privacy Section */}
            <section className="py-6 md:py-12 mb-2 rounded-2xl max-w-screen-lg mx-auto w-full flex flex-col gap-4 md:flex-row px-4">
                <div className="md:w-1/2 h-full">
                    <h2 className="text-3xl font-semibold mb-6">For your eyes only</h2>
                    <p className="max-w-2xl mx-auto textRegular !text-base mb-4">
                        Your notes are stored locally on your computer. They are encrypted on your device and when synced to your Google Drive. No one can read them without your password, not even us.
                    </p>
                    <ChipLink to={"/coming-soon"} label={'More on security'} />
                </div>
                <div className="md:w-1/2 min-h-60 flex items-center justify-center bg-slate-50 dark:bg-[#1f1f2d] rounded-lg">
                    <div className="max-w-32">
                        <ThemedSvg url={'secure'} />
                    </div>
                </div>
            </section>

            <section className="py-6 md:py-12 mb-2 rounded-2xl max-w-screen-lg mx-auto w-full flex flex-col gap-4 md:flex-row px-4">
                <div className="md:w-1/2 h-full">
                    <h2 className="text-3xl font-semibold mb-6">Mintype on all your devices</h2>
                    <p className="max-w-2xl mx-auto textRegular !text-base mb-4">
                        Our app is built for the web, so it works on all devices with a browser. Install the PWA for a more native experience. An electron desktop app is also coming soon.
                    </p>
                    <ChipLink to={"/coming-soon"} label={'Install PWA'} />
                </div>
                <div className="md:w-1/2 min-h-60 flex items-center justify-center bg-slate-50 dark:bg-[#1f1f2d] rounded-lg">
                    <div className="h-20">
                        <ThemedSvg url={'devices'} />
                    </div>
                </div>
            </section>

            <section className="py-6 md:pt-20 mb-2 rounded-2xl w-full md:max-w-screen-lg mx-auto px-4">
                <h2 className="text-3xl font-semibold pb-3">
                    How others are using Mintype
                </h2>
                <p className="mb-12 textRegular !text-base max-w-2xl">
                    We are constantly working on new features to make Mintype even better for you.
                    Here are some interesting features we have built and our users have discovered.
                </p>
                <Carousel items={slides} />
            </section>

            <section className="py-6 md:py-20 mb-2 rounded-2xl max-w-screen-lg mx-auto w-full px-4">
                <div className="text-4xl md:text-6xl font-semibold mb-6 text-center flex justify-center">
                    <div className="w-fit relative dark:text-white">
                        ...and it's free.
                        <div className="absolute h-20 md:h-24 -right-12 md:-right-14 -top-2 md:-top-1">
                            <ThemedSvg url={'thumbs-up'} />
                        </div>
                    </div>
                </div>
                <p className="textRegular !text-base text-center">
                    Yep, Mintype is free to use. There are no note limits, ads, or subscriptions.
                </p>
            </section>

            {/* Footer */}
            <footer className="text-center text-gray-400 text-sm relative max-w-screen-lg mx-auto w-full rounded-2xl mb-2 px-4">
                <div className="flex flex-col gap-4 md:flex-row pt-12 pb-12 md:pb-24">
                    <div className="md:w-1/2 text-left space-y-3">
                        <h3 className="font-semibold text-xl">Help make Mintype better</h3>
                        <p className="max-w-md">
                            If you have any questions or suggestions, please don't hesitate to reach out on our Discord or Github.
                        </p>
                        <div className="flex gap-2">
                            <a
                                href="https://github.com/project59/mintype"
                                className="btnPrimary flex items-center w-fit"
                            >
                                Star on GitHub
                            </a>
                            <a
                                href="https://github.com/orgs/project59/projects/1"
                                className="btnPrimary flex items-center w-fit"
                            >
                                Roadmap
                            </a>
                            {/* <a
                        href="/app"
                        className="btnPrimary flex items-center w-fit"
                    >
                        Sponsor
                    </a> */}
                            <a
                                href="/coming-soon"
                                className="btnPrimary flex items-center w-fit"
                            >
                                Docs
                            </a>
                        </div>
                    </div>
                    <div className="md:w-1/4 flex flex-col text-left space-y-2">
                        <h3 className="font-semibold pb-2">Resources</h3>
                        <a href="https://github.com/project59/mintype" className="hover:text-gray-800  dark:hover:text-gray-200 transition">
                            GitHub
                        </a>
                        <a href="/coming-soon" className="hover:text-gray-800  dark:hover:text-gray-200 transition">
                            Store
                        </a>
                        <a href="/coming-soon" className="hover:text-gray-800  dark:hover:text-gray-200 transition">
                            Privacy
                        </a>
                        <a href="/coming-soon" className="hover:text-gray-800  dark:hover:text-gray-200 transition">
                            Support Mintype
                        </a>
                    </div>
                    <div className="md:w-1/4 flex flex-col text-left space-y-2">
                        <h3 className="font-semibold pb-2">Updates</h3>
                        <a href="https://github.com/orgs/project59/projects/1" className="hover:text-gray-800  dark:hover:text-gray-200 transition">
                            Roadmap
                        </a>
                        <a href="/coming-soon" className="hover:text-gray-800  dark:hover:text-gray-200 transition">
                            Docs
                        </a>
                        <a href="/coming-soon" className="hover:text-gray-800  dark:hover:text-gray-200 transition">
                            Changelog
                        </a>
                        <a href="/coming-soon" className="hover:text-gray-800  dark:hover:text-gray-200 transition">
                            Dev Blog
                        </a>
                    </div>
                </div>

                <img src="/Mintype.svg" alt="Mintype Logo" className="w-full mx-auto" />
            </footer>
        </div>
    );
}