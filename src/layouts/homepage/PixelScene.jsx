import { useEffect, useMemo, useRef, useState } from "react";

const ROWS = 20;
const MIN_COLS = 60;
const CELL_PX = 11;

const FONT = {
    M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
};
const WORD = "MINTYPE";
const WORD_WIDTH = WORD.length * 6 - 1;
const TEXT_TOP = 2;

// Peaks echo the two mint mountains in the logo: [center, height, half width],
// tiled every HILL_PERIOD columns across the screen.
const PEAKS = [[4, 8, 8], [15, 5, 7], [27, 8, 9], [40, 6, 8], [52, 9, 9]];
const HILL_PERIOD = 60;

const FILLS = {
    sky: "fill-transparent",
    star: "fill-gray-200 dark:fill-white/25",
    text: "fill-gray-900 dark:fill-white",
    moon: "fill-[#4F4772] dark:fill-violet-300",
    crater: "fill-[#3d3760] dark:fill-violet-400",
    mint: "fill-[#afffc7]",
    shade: "fill-[#7fe6a0] dark:fill-[#6fd894]",
    deep: "fill-[#5ccf86] dark:fill-[#4fbf78]",
};

const PAINT = ["#ec4899", "#3b82f6", "#f59e0b", "#10b981", "#a855f7"];

function hash(x, y) {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
}

function buildGrid(cols) {
    const textLeft = Math.floor((cols - WORD_WIDTH) / 2);
    const moon = { x: Math.min(cols - 4, textLeft + WORD_WIDTH + 5), y: 3, r: 2.3 };
    const peaks = [];
    for (let offset = -HILL_PERIOD; offset < cols + HILL_PERIOD; offset += HILL_PERIOD) {
        for (const [c, h, w] of PEAKS) peaks.push([c + offset, h, w]);
    }

    const grid = [];
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < cols; x++) {
            let kind = "sky";
            // tallest peak covering this column decides the ground height and shading side
            let ground = 0;
            let shadedSide = false;
            for (const [c, h, w] of peaks) {
                const height = h - (Math.abs(x - c) * h) / w;
                if (height > ground) {
                    ground = height;
                    shadedSide = x > c;
                }
            }
            const depth = y - (ROWS - Math.round(ground));
            if (depth >= 0) {
                kind = shadedSide ? "shade" : "mint";
                if (depth > 2 && hash(x, y) > 0.86) kind = "deep";
            } else if (Math.hypot(x - moon.x, y - moon.y) <= moon.r) {
                kind = (x === moon.x - 1 && y === moon.y - 1) || (x === moon.x + 1 && y === moon.y + 1) ? "crater" : "moon";
            } else if (y < 11 && hash(x, y) > 0.975) {
                kind = "star";
            }

            const tx = x - textLeft;
            const ty = y - TEXT_TOP;
            if (tx >= 0 && ty >= 0 && ty < 7 && tx % 6 < 5) {
                const letter = FONT[WORD[Math.floor(tx / 6)]];
                if (letter && letter[ty][tx % 6] === "1") kind = "text";
            }
            grid.push(kind);
        }
    }
    return grid;
}

const colsFor = (width) => Math.max(MIN_COLS, Math.round(width / CELL_PX));

export default function PixelScene() {
    const svgRef = useRef(null);
    const cells = useRef([]);
    const [cols, setCols] = useState(() => colsFor(document.documentElement.clientWidth));
    const grid = useMemo(() => buildGrid(cols), [cols]);

    useEffect(() => {
        const observer = new ResizeObserver(([entry]) => setCols(colsFor(entry.contentRect.width)));
        observer.observe(svgRef.current);
        return () => observer.disconnect();
    }, []);

    const paint = (x, y) => {
        if (x < 0 || y < 0 || x >= cols || y >= ROWS) return;
        const rect = cells.current[y * cols + x];
        if (!rect) return;
        rect.style.transition = "none";
        rect.style.fill = PAINT[Math.floor(Math.random() * PAINT.length)];
        clearTimeout(rect.fadeTimer);
        rect.fadeTimer = setTimeout(() => {
            rect.style.transition = "fill 1200ms ease-out";
            rect.style.fill = "";
            rect.fadeTimer = setTimeout(() => { rect.style.transition = ""; }, 1200);
        }, 350);
    };

    const cellAt = (e) => {
        const rect = svgRef.current.getBoundingClientRect();
        return [
            Math.floor(((e.clientX - rect.left) / rect.width) * cols),
            Math.floor(((e.clientY - rect.top) / rect.height) * ROWS),
        ];
    };

    const onPointerMove = (e) => {
        const [x, y] = cellAt(e);
        paint(x, y);
    };

    const onPointerDown = (e) => {
        const [x, y] = cellAt(e);
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (Math.abs(dx) + Math.abs(dy) < 2) paint(x + dx, y + dy);
            }
        }
    };

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${cols} ${ROWS}`}
            shapeRendering="crispEdges"
            className="block w-full h-auto select-none"
            onPointerMove={onPointerMove}
            onPointerDown={onPointerDown}
            role="img"
            aria-label="Pixel art of mint mountains under the word Mintype"
        >
            {grid.map((kind, i) => (
                <rect
                    key={i}
                    ref={(el) => { cells.current[i] = el; }}
                    x={i % cols}
                    y={Math.floor(i / cols)}
                    width="1"
                    height="1"
                    className={FILLS[kind]}
                />
            ))}
        </svg>
    );
}
