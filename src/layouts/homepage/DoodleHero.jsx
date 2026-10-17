import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Pencil, Undo2, Trash2 } from "lucide-react";

const INKS = [
    { name: "Ink", value: "currentColor", swatch: "bg-gray-900 dark:bg-gray-100" },
    { name: "Mint", value: "#10b981", swatch: "bg-emerald-500" },
    { name: "Pink", value: "#ec4899", swatch: "bg-pink-500" },
    { name: "Blue", value: "#3b82f6", swatch: "bg-blue-500" },
];

const STICKIES = [
    { id: "milk", x: 7, y: 14, phone: { x: 4, y: 3 }, rotate: -6, className: "bg-yellow-200 text-yellow-950", body: <>buy oat milk 🥛<br /><span className="line-through opacity-60">finish slides</span></> },
    { id: "math", x: 76, y: 10, phone: { x: 58, y: 5 }, rotate: 4, className: "bg-pink-200 text-pink-950", body: <>∫ x² dx = x³⁄3 + C<br /><span className="text-xs opacity-70">(check this!!)</span></> },
    { id: "idea", x: 79, y: 62, rotate: -3, className: "bg-[#afffc7] text-emerald-950", body: <>idea: a notes app that <b>can't</b> read my notes</>, desktopOnly: true },
    { id: "drag", x: 10, y: 68, rotate: 7, className: "bg-sky-200 text-sky-950", body: <>drag me around ↗</>, desktopOnly: true },
];

function toPath(points) {
    if (points.length === 1) {
        const [x, y] = points[0];
        return `M ${x} ${y} l 0.1 0`;
    }
    let d = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 1; i < points.length - 1; i++) {
        const [x, y] = points[i];
        const [nx, ny] = points[i + 1];
        d += ` Q ${x} ${y} ${(x + nx) / 2} ${(y + ny) / 2}`;
    }
    const [lx, ly] = points[points.length - 1];
    return `${d} L ${lx} ${ly}`;
}

function Sticky({ sticky, boardRef }) {
    const [pos, setPos] = useState(() => (
        sticky.phone && window.matchMedia("(max-width: 767px)").matches ? sticky.phone : { x: sticky.x, y: sticky.y }
    ));
    const [dragging, setDragging] = useState(false);
    const start = useRef(null);

    const onPointerDown = (e) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
        setDragging(true);
    };
    const onPointerMove = (e) => {
        if (!start.current) return;
        const rect = boardRef.current.getBoundingClientRect();
        setPos({
            x: Math.min(92, Math.max(0, start.current.x + ((e.clientX - start.current.px) / rect.width) * 100)),
            y: Math.min(90, Math.max(0, start.current.y + ((e.clientY - start.current.py) / rect.height) * 100)),
        });
    };
    const onPointerUp = () => {
        start.current = null;
        setDragging(false);
    };

    return (
        <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className={`${sticky.desktopOnly ? "hidden md:block" : ""} absolute z-20 w-28 md:w-40 p-2.5 md:p-3 text-xs md:text-sm font-['Playpen_Sans'] leading-snug shadow-md touch-none select-none transition-[transform,box-shadow] duration-150 ${dragging ? "cursor-grabbing shadow-xl scale-105" : "cursor-grab hover:shadow-lg"} ${sticky.className}`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, rotate: `${dragging ? 0 : sticky.rotate}deg` }}
        >
            {sticky.body}
        </div>
    );
}

function TaskCard() {
    const [tasks, setTasks] = useState([
        { label: "sketch the big idea", done: true },
        { label: "water the plants", done: false },
        { label: "try Mintype", done: false },
    ]);
    return (
        <div className="hidden lg:block absolute z-20 left-[6%] top-[40%] w-52 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c2e] p-4 shadow-sm -rotate-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Weekend</p>
            {tasks.map((task, i) => (
                <label key={task.label} className="flex items-center gap-2 py-0.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
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
    );
}

export default function DoodleHero() {
    const boardRef = useRef(null);
    const current = useRef(null);
    const [strokes, setStrokes] = useState([]);
    const [live, setLive] = useState(null);
    const [ink, setInk] = useState(INKS[1].value);
    const [penOn, setPenOn] = useState(() => window.matchMedia("(pointer: fine)").matches);

    const point = (e) => {
        const rect = boardRef.current.getBoundingClientRect();
        return [Math.round(e.clientX - rect.left), Math.round(e.clientY - rect.top)];
    };

    const onPointerDown = (e) => {
        if (!penOn || e.button !== 0 || e.target.closest("a, button, input, label")) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        current.current = { color: ink, points: [point(e)] };
        setLive({ color: ink, d: toPath(current.current.points) });
    };
    const onPointerMove = (e) => {
        if (!current.current) return;
        current.current.points.push(point(e));
        setLive({ color: current.current.color, d: toPath(current.current.points) });
    };
    const onPointerUp = () => {
        if (!current.current) return;
        const stroke = { id: Date.now(), color: current.current.color, d: toPath(current.current.points) };
        setStrokes((s) => [...s, stroke]);
        setLive(null);
        current.current = null;
    };

    const hasDrawn = strokes.length > 0 || live;

    return (
        <section
            ref={boardRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={`relative isolate w-full h-[min(88vh,780px)] min-h-[600px] overflow-hidden bg-[#fbfaf7] dark:bg-[#10101e] bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] dark:bg-[radial-gradient(#2a2a3e_1px,transparent_1px)] [background-size:22px_22px] ${penOn ? "touch-none cursor-crosshair" : ""}`}
        >
            {STICKIES.map((s) => <Sticky key={s.id} sticky={s} boardRef={boardRef} />)}
            <TaskCard />

            {/* Headline */}
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-4 text-center">
                <h1 className="mt-16 md:mt-0 text-5xl md:text-7xl font-semibold tracking-tight text-gray-900 dark:text-white max-w-3xl leading-[1.05] text-balance">
                    A space for your best ideas
                </h1>
                <p className="mt-6 max-w-md text-base text-gray-600 dark:text-gray-400">
                    Documents and an infinite whiteboard, encrypted on your device. Free, offline, and synced to your own Google Drive.
                </p>
                <div className="pointer-events-auto mt-8 flex flex-col sm:flex-row items-center gap-3">
                    <Link to="/workspace" className="btnPrimary !h-11 !px-5 !text-sm gap-1.5 group shadow-sm">
                        Enter Workspace
                        <ArrowRight className="group-hover:translate-x-1 duration-200" size={16} />
                    </Link>
                </div>
            </div>

            {/* Hint, fades once the visitor draws */}
            <div className={`pointer-events-none absolute z-10 left-1/2 bottom-[68px] md:bottom-28 -translate-x-1/2 md:translate-x-[180px] flex items-end gap-1 whitespace-nowrap text-gray-500 dark:text-gray-400 transition-opacity duration-500 ${hasDrawn ? "opacity-0" : "opacity-100"}`}>
                <svg width="56" height="44" viewBox="0 0 56 44" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="hidden md:block -scale-x-100" aria-hidden>
                    <path d="M4 40 C 10 18, 30 8, 50 10" />
                    <path d="M42 4 L 51 10 L 43 17" />
                </svg>
                <span className="font-['Playpen_Sans'] text-sm -rotate-3 md:mb-6">
                    {penOn ? "psst… draw anywhere" : "tap the pencil to doodle"}
                </span>
            </div>

            {/* Doodle layer */}
            <svg className="pointer-events-none absolute inset-0 z-30 w-full h-full text-gray-900 dark:text-gray-100" aria-hidden>
                {/* A pre-drawn star so the board feels used */}
                <path d="M 0 -18 L 5 -6 L 18 -6 L 8 3 L 12 16 L 0 8 L -12 16 L -8 3 L -18 -6 L -5 -6 Z" className="hidden md:block" style={{ transform: "translate(70%, 30%) rotate(8deg)" }} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinejoin="round" />
                {strokes.map((s) => (
                    <path key={s.id} d={s.d} stroke={s.color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                ))}
                {live && <path d={live.d} stroke={live.color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
            </svg>

            {/* Mini toolbar */}
            <div className="absolute z-40 bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#1c1c2e]/90 backdrop-blur px-2 py-1.5 shadow-sm">
                <button
                    title="Pencil"
                    onClick={() => setPenOn((p) => !p)}
                    className={`h-8 w-8 rounded-full flex items-center justify-center duration-150 ${penOn ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"}`}
                >
                    <Pencil size={15} />
                </button>
                <div className="w-px h-5 bg-gray-200 dark:bg-white/10 mx-1" />
                {INKS.map((c) => (
                    <button
                        key={c.name}
                        title={c.name}
                        onClick={() => { setInk(c.value); setPenOn(true); }}
                        className={`h-8 w-8 rounded-full flex items-center justify-center ${ink === c.value ? "ring-2 ring-gray-300 dark:ring-white/30" : ""}`}
                    >
                        <span className={`h-4 w-4 rounded-full ${c.swatch}`} />
                    </button>
                ))}
                <div className="w-px h-5 bg-gray-200 dark:bg-white/10 mx-1" />
                <button title="Undo" disabled={!strokes.length} onClick={() => setStrokes((s) => s.slice(0, -1))} className="h-8 w-8 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30">
                    <Undo2 size={15} />
                </button>
                <button title="Clear" disabled={!strokes.length} onClick={() => setStrokes([])} className="h-8 w-8 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30">
                    <Trash2 size={15} />
                </button>
            </div>
        </section>
    );
}
