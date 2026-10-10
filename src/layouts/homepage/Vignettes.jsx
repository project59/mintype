import { useEffect, useState } from "react";
import { Check, Eye, Link2, Lock } from "lucide-react";
import { DrawnPath, HandNote, useInView } from "./doodles.jsx";

const TYPED = "Pastéis de nata at 9, tram 28 after, then get happily lost in Alfama.";

function useTyping(text, start) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!start) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setCount(text.length);
            return;
        }
        const id = setInterval(() => {
            setCount((c) => {
                if (c >= text.length) {
                    clearInterval(id);
                    return c;
                }
                return c + 1;
            });
        }, 35);
        return () => clearInterval(id);
    }, [start, text]);
    return text.slice(0, count);
}

function Row({ index, label, title, children, visual, flip }) {
    return (
        <div className={`flex flex-col gap-10 md:gap-16 md:items-center ${flip ? "md:flex-row-reverse" : "md:flex-row"}`}>
            <div className="md:w-5/12">
                <HandNote className="inline-block -rotate-2 mb-3">{index} · {label}</HandNote>
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 dark:text-white mb-4">{title}</h2>
                <div className="text-base text-gray-600 dark:text-gray-400 space-y-3 max-w-md">{children}</div>
            </div>
            <div className="md:w-7/12 relative">{visual}</div>
        </div>
    );
}

function WriteVisual() {
    const [ref, inView] = useInView();
    const typed = useTyping(TYPED, inView);
    const [tasks, setTasks] = useState([
        { label: "Flights booked", done: true },
        { label: "Pack the film camera", done: false },
        { label: "Learn to say “obrigado”", done: false },
    ]);
    const done = typed.length === TYPED.length;

    return (
        <div ref={ref} className="relative">
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c2e] p-6 md:p-8 shadow-sm">
                <p className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-3">🇵🇹 Lisbon, day one</p>
                <p className="text-gray-700 dark:text-gray-300 min-h-[3rem]">
                    {typed}
                    <span className={`inline-block w-0.5 h-5 align-text-bottom bg-emerald-500 ml-0.5 ${done ? "animate-pulse" : ""}`} />
                </p>
                <div className="mt-4 flex gap-2 rounded-lg bg-amber-50 dark:bg-amber-400/10 p-3 text-sm text-amber-900 dark:text-amber-200">
                    <span>💡</span>
                    <span>Book the sunset tram tour before Friday, it sells out.</span>
                </div>
                <div className="mt-4 space-y-1">
                    {tasks.map((task, i) => (
                        <label key={task.label} className="flex items-center gap-2 text-gray-700 dark:text-gray-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={task.done}
                                onChange={() => setTasks((t) => t.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}
                                className="accent-emerald-500"
                            />
                            <span className={task.done ? "line-through opacity-50" : ""}>{task.label}</span>
                        </label>
                    ))}
                </div>
            </div>
            {/* Slash menu peeking out of the card */}
            <div className={`absolute -bottom-8 right-4 md:-right-6 w-44 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#24243a] p-1.5 shadow-lg text-sm transition-all duration-500 motion-reduce:transition-none ${done ? "opacity-100 translate-y-0 rotate-2" : "opacity-0 translate-y-3 rotate-0"}`}>
                {["📌 Callout", "☑️ To-do list", "▦ Table", "▶️ YouTube", "🗂 Columns"].map((item, i) => (
                    <div key={item} className={`px-2 py-1 rounded-md text-gray-700 dark:text-gray-300 ${i === 0 ? "bg-gray-100 dark:bg-white/10" : ""}`}>{item}</div>
                ))}
            </div>
            <HandNote className={`hidden md:block absolute -bottom-16 right-52 -rotate-3 transition-opacity duration-500 delay-300 ${done ? "opacity-100" : "opacity-0"}`}>
                type / for any block →
            </HandNote>
        </div>
    );
}

function SketchVisual() {
    const [ref, inView] = useInView();
    return (
        <div ref={ref} className="relative rounded-2xl border border-gray-200 dark:border-white/10 bg-[#fbfaf7] dark:bg-[#151526] bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] dark:bg-[radial-gradient(#2a2a3e_1px,transparent_1px)] [background-size:18px_18px] h-80 md:h-96 overflow-hidden shadow-sm">
            <svg viewBox="0 0 420 300" className="absolute inset-0 w-full h-full text-gray-900 dark:text-gray-100" aria-hidden>
                {/* axes */}
                <DrawnPath show={inView} d="M 40 160 C 140 158, 260 162, 300 160 M 290 152 L 302 160 L 290 168" stroke="#10b981" strokeWidth="3" />
                <DrawnPath show={inView} delay={200} d="M 60 270 C 58 200, 62 100, 60 40 M 52 52 L 60 38 L 68 52" stroke="#10b981" strokeWidth="3" />
                {/* the curve */}
                <DrawnPath show={inView} delay={600} duration={1400} d="M 60 160 C 85 80, 115 80, 140 160 S 195 240, 220 160 S 275 80, 290 120" stroke="currentColor" strokeWidth="3.5" />
                {/* circle the peak */}
                <DrawnPath show={inView} delay={2000} d="M 120 92 C 120 70, 80 66, 82 92 C 84 116, 124 114, 118 88" stroke="#ec4899" strokeWidth="2.5" />
                {/* arrow from the note to the peak */}
                <DrawnPath show={inView} delay={2300} d="M 232 58 C 190 40, 150 52, 128 76 M 132 64 L 127 77 L 140 76" stroke="#ec4899" strokeWidth="2.5" />
                <text x="306" y="166" className="fill-emerald-500 font-['Playpen_Sans'] text-[16px]">x</text>
                <text x="70" y="44" className="fill-emerald-500 font-['Playpen_Sans'] text-[16px]">y</text>
            </svg>
            <div className={`absolute right-[6%] top-[8%] w-36 rotate-3 bg-pink-200 text-pink-950 p-3 shadow-md font-['Playpen_Sans'] text-sm transition-all duration-500 delay-[2500ms] motion-reduce:transition-none ${inView ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}>
                max at π⁄2 !!
            </div>
            <div className="absolute left-[50%] md:left-[56%] bottom-[8%] w-44 md:w-52 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c2e] p-3 shadow-sm text-sm -rotate-1">
                <p className="font-semibold text-gray-900 dark:text-white">f(x) = sin x</p>
                <ul className="mt-1 list-disc pl-4 text-gray-600 dark:text-gray-400">
                    <li>period is 2π</li>
                    <li>range −1 to 1</li>
                </ul>
            </div>
        </div>
    );
}

function ShareVisual() {
    const [ref, inView] = useInView();
    const [shared, setShared] = useState(false);
    return (
        <div ref={ref} className="relative pt-2 pb-16 md:pb-10">
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c2e] p-5 md:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <p className="font-semibold text-gray-900 dark:text-white">Share “Lisbon, day one”</p>
                    <button
                        onClick={() => setShared(true)}
                        className="btnPrimary gap-1.5"
                    >
                        {shared ? <><Check size={14} /> Link ready</> : <><Link2 size={14} /> Create link</>}
                    </button>
                </div>
                <div className={`flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-2.5 font-mono text-xs md:text-sm overflow-hidden transition-opacity duration-300 ${shared ? "opacity-100" : "opacity-40"}`}>
                    <Lock size={14} className="shrink-0 text-emerald-500" />
                    <span className="truncate text-gray-500 dark:text-gray-400">
                        <span className="hidden sm:inline">{window.location.host}</span><span className="sm:hidden">…</span>/quickshare/x7Kq2mP
                        <span className="rounded bg-[#afffc7] text-emerald-950 px-1">#k=9fQ2vL…</span>
                    </span>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Eye size={14} /> Anyone with the link can view, read-only.
                </div>
            </div>
            <svg viewBox="0 0 120 70" className="absolute left-1/2 -bottom-6 w-24 md:w-28 text-gray-400 dark:text-gray-500" aria-hidden>
                <DrawnPath show={inView && shared} d="M 10 66 C 40 62, 82 44, 92 8 M 82 16 L 92 5 L 101 17" stroke="currentColor" strokeWidth="2.5" />
            </svg>
            <HandNote className={`absolute -bottom-10 right-[52%] w-40 md:w-44 text-right -rotate-2 transition-opacity duration-500 delay-500 ${shared ? "opacity-100" : "opacity-0"}`}>
                the key lives here, our server never sees it
            </HandNote>
            <HandNote className={`absolute -bottom-8 md:-bottom-10 right-0 md:right-6 -rotate-3 transition-opacity duration-300 ${shared ? "opacity-0" : "opacity-100"}`}>
                go on, press it ↑
            </HandNote>
        </div>
    );
}

export default function Vignettes() {
    return (
        <section className="max-w-screen-lg mx-auto w-full px-4 py-24 md:py-32 flex flex-col gap-28 md:gap-40">
            <Row index="01" label="write" title="Documents that feel like paper." visual={<WriteVisual />}>
                <p>Headings, callouts, to-dos, tables, code, columns and embeds, all one <span className="font-mono text-sm rounded bg-gray-100 dark:bg-white/10 px-1">/</span> away.</p>
                <p>Everything is saved as Markdown, so your notes are never trapped in here.</p>
            </Row>
            <Row index="02" label="sketch" title="Work it out on the board." visual={<SketchVisual />} flip>
                <p>Draw graphs, sketch diagrams, scatter sticky notes and drop in images on an infinite canvas.</p>
                <p>Markdown cards sit right on the board, so the notes live next to the doodles.</p>
            </Row>
            <Row index="03" label="share" title="Share a page, not your secrets." visual={<ShareVisual />}>
                <p>QuickShare turns any document or whiteboard into a read-only link for 24 hours.</p>
                <p>It's encrypted end to end. The key travels inside the link itself, so only people you send it to can open it.</p>
            </Row>
        </section>
    );
}
