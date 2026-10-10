import { useEffect, useRef, useState } from "react";

export function useInView(threshold = 0.4) {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setInView(true);
                observer.disconnect();
            }
        }, { threshold });
        observer.observe(el);
        return () => observer.disconnect();
    }, [threshold]);
    return [ref, inView];
}

// A stroke that draws itself once `show` turns true.
export function DrawnPath({ d, show, delay = 0, duration = 900, className = "", ...props }) {
    return (
        <path
            d={d}
            pathLength="1"
            strokeDasharray="1"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-[stroke-dashoffset] ease-out motion-reduce:transition-none ${show ? "[stroke-dashoffset:0]" : "[stroke-dashoffset:1]"} ${className}`}
            style={{ transitionDuration: `${duration}ms`, transitionDelay: `${delay}ms` }}
            {...props}
        />
    );
}

export function HandNote({ children, className = "" }) {
    return <span className={`font-['Playpen_Sans'] text-sm text-gray-500 dark:text-gray-400 ${className}`}>{children}</span>;
}
