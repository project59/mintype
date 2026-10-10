import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ArrowRight, Github } from "lucide-react";
import { getItem } from "../layouts/secure-context/dbUtils.js";
import ThemeToggleBtn from "../components/common/ThemeToggleBtn.jsx";
import DoodleHero from "../layouts/homepage/DoodleHero.jsx";
import Vignettes from "../layouts/homepage/Vignettes.jsx";
import PixelScene from "../layouts/homepage/PixelScene.jsx";
import { DrawnPath, HandNote, useInView } from "../layouts/homepage/doodles.jsx";

const PROMISES = [
    {
        title: "Locked on your device",
        text: "Pages are encrypted with your password before they're saved. Nothing readable ever leaves your browser.",
        doodle: (show) => (
            <>
                <DrawnPath show={show} d="M 14 30 C 14 24, 46 23, 46 30 L 47 54 C 47 58, 14 59, 13 54 Z" stroke="currentColor" strokeWidth="2.5" />
                <DrawnPath show={show} delay={300} d="M 20 29 C 19 10, 41 8, 40 29" stroke="currentColor" strokeWidth="2.5" />
                <DrawnPath show={show} delay={600} d="M 30 40 L 30 47" stroke="#10b981" strokeWidth="3" />
            </>
        ),
    },
    {
        title: "Synced to your own Drive",
        text: "Turn on Google Drive sync to pick up where you left off on any device. Drive only ever stores scrambled files.",
        doodle: (show) => (
            <>
                <DrawnPath show={show} d="M 16 46 C 4 46, 6 30, 17 31 C 17 18, 36 14, 40 27 C 52 24, 56 46, 44 46 Z" stroke="currentColor" strokeWidth="2.5" />
                <DrawnPath show={show} delay={400} d="M 30 54 L 30 36 M 24 42 L 30 35 L 36 42" stroke="#10b981" strokeWidth="2.5" />
            </>
        ),
    },
    {
        title: "Not even we can peek",
        text: "We never see your password or your notes. Keep your recovery key somewhere safe, it's the only spare.",
        doodle: (show) => (
            <>
                <DrawnPath show={show} d="M 8 30 C 20 46, 40 46, 52 30" stroke="currentColor" strokeWidth="2.5" />
                <DrawnPath show={show} delay={400} d="M 16 38 L 12 45 M 30 42 L 30 50 M 44 38 L 48 45" stroke="#10b981" strokeWidth="2.5" />
            </>
        ),
    },
];

const EXTRAS = [
    { label: "⏱ Pomodoro timer", className: "bg-yellow-200 text-yellow-950" },
    { label: "📺 YouTube embeds", className: "bg-pink-200 text-pink-950" },
    { label: "🗺 Google Maps", className: "bg-sky-200 text-sky-950" },
    { label: "💻 Code blocks", className: "bg-[#afffc7] text-emerald-950" },
    { label: "▦ Tables", className: "bg-orange-200 text-orange-950" },
    { label: "@ Page links", className: "bg-violet-200 text-violet-950" },
    { label: "📴 Works offline", className: "bg-yellow-200 text-yellow-950" },
    { label: "📱 Installs like an app", className: "bg-sky-200 text-sky-950" },
    { label: "⬇️ Markdown export", className: "bg-pink-200 text-pink-950" },
    { label: "∞ No page limits", className: "bg-[#afffc7] text-emerald-950" },
];
const TILTS = ["-rotate-3", "rotate-2", "-rotate-1", "rotate-3", "-rotate-2", "rotate-1"];

function PrivacyPromise({ promise, index }) {
    const [ref, inView] = useInView(0.6);
    return (
        <div ref={ref} className="flex flex-col">
            <svg viewBox="0 0 60 60" className="w-14 h-14 mb-4 text-gray-900 dark:text-gray-100" aria-hidden>
                {promise.doodle(inView)}
            </svg>
            <HandNote className="mb-1">0{index + 1}</HandNote>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{promise.title}</h3>
            <p className="text-gray-600 dark:text-gray-400">{promise.text}</p>
        </div>
    );
}

function Privacy() {
    const [ref, inView] = useInView(0.6);
    return (
        <section className="bg-[#fbfaf7] dark:bg-[#151526]">
            <div className="max-w-screen-lg mx-auto w-full px-4 py-24 md:py-32">
                <h2 ref={ref} className="text-4xl md:text-6xl font-semibold tracking-tight text-gray-900 dark:text-white mb-4">
                    For your{" "}
                    <span className="relative inline-block">
                        eyes
                        <svg viewBox="0 0 120 20" preserveAspectRatio="none" className="absolute left-0 -bottom-3 w-full h-4" aria-hidden>
                            <DrawnPath show={inView} d="M 3 12 C 30 6, 80 4, 117 9" stroke="#10b981" strokeWidth="4" />
                        </svg>
                    </span>{" "}
                    only.
                </h2>
                <p className="text-base text-gray-600 dark:text-gray-400 max-w-lg mb-16">
                    Mintype is local-first. Your notes live in your browser, and they are encrypted before they go anywhere else.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-10">
                    {PROMISES.map((p, i) => <PrivacyPromise key={p.title} promise={p} index={i} />)}
                </div>
            </div>
        </section>
    );
}

function Extras() {
    return (
        <section className="max-w-screen-lg mx-auto w-full px-4 py-24 md:py-32 text-center">
            <HandNote className="inline-block -rotate-2 mb-3">and the little things</HandNote>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 dark:text-white mb-12">Also in the box.</h2>
            <div className="flex flex-wrap justify-center gap-3 md:gap-4 max-w-3xl mx-auto">
                {EXTRAS.map((extra, i) => (
                    <span
                        key={extra.label}
                        className={`px-4 py-2.5 shadow-sm font-['Playpen_Sans'] text-sm md:text-base hover:rotate-0 hover:scale-110 hover:shadow-md duration-200 ${TILTS[i % TILTS.length]} ${extra.className}`}
                    >
                        {extra.label}
                    </span>
                ))}
            </div>
        </section>
    );
}

function Free() {
    const [ref, inView] = useInView(0.6);
    return (
        <section className="max-w-screen-lg mx-auto w-full px-4 pb-24 md:pb-32 text-center">
            <h2 ref={ref} className="text-5xl md:text-7xl font-semibold tracking-tight text-gray-900 dark:text-white">
                …and it's{" "}
                <span className="relative inline-block px-2">
                    free.
                    <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="absolute -inset-x-4 -inset-y-3 w-[calc(100%+2rem)] h-[calc(100%+1.5rem)]" aria-hidden>
                        <DrawnPath show={inView} duration={1100} d="M 150 14 C 100 0, 20 10, 10 46 C 2 82, 90 96, 160 86 C 205 78, 200 22, 130 10" stroke="#ec4899" strokeWidth="3.5" />
                    </svg>
                </span>
            </h2>
            <p className="mt-8 text-base text-gray-600 dark:text-gray-400">
                No note limits, no ads, no subscriptions. Really.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/workspace" className="btnPrimary !h-11 !px-5 !text-sm gap-1.5 group shadow-sm">
                    Enter Workspace
                    <ArrowRight className="group-hover:translate-x-1 duration-200" size={16} />
                </Link>
                <a href="https://github.com/project59/mintype" className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                    <Github size={16} /> Star it on GitHub
                </a>
            </div>
        </section>
    );
}

const FOOTER_LINKS = [
    { label: "GitHub", href: "https://github.com/project59/mintype" },
    { label: "Discussion", href: "https://github.com/project59/mintype/discussions" },
    { label: "Announcements", href: "https://github.com/project59/mintype/discussions/categories/announcements" },
];

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

    return (
        <div className="flex flex-col min-h-screen overflow-x-clip bg-white dark:bg-[#10101e] text-gray-900 selection:bg-[#afffc7] selection:text-emerald-950">
            <header className="sticky top-0 bg-white/80 dark:bg-[#10101e]/80 z-50 backdrop-blur-sm px-4 border-b border-gray-200/60 dark:border-white/5">
                <nav className="flex items-center justify-between py-3 max-w-screen-lg mx-auto">
                    <div className="flex items-center gap-2">
                        <img className="h-5" src="favicon.svg" alt="logo" />
                        <p className="font-semibold text-xl text-black dark:text-white">Mintype</p>
                    </div>
                    <div className="flex items-center gap-1">
                        <a href="https://github.com/project59/mintype" className="text-xs rounded-full bg-blue-500 p-1 px-1.5 text-white font-medium">
                            v2.0
                        </a>
                        <ThemeToggleBtn />
                    </div>
                </nav>
            </header>

            <DoodleHero />
            <Vignettes />
            <Privacy />
            <Extras />
            <Free />

            <footer className="w-full pt-12">
                <div className="max-w-screen-lg mx-auto w-full px-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-10">
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white">Help make Mintype better</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Questions or ideas? Let us know on GitHub.</p>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                            {FOOTER_LINKS.map((link) => (
                                <a key={link.label} href={link.href} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white duration-150">
                                    {link.label}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
                <PixelScene />
            </footer>
        </div>
    );
}
