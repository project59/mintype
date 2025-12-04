import { useState } from "react";

export default function Carousel({ items = [] }) {
    const [current, setCurrent] = useState(0);
    const [expandedIndex, setExpandedIndex] = useState(0);

    const handleLabelClick = (index) => {
        setCurrent(index);
        setExpandedIndex(expandedIndex === index ? -1 : index);
    };

    return (
        <div className="relative w-full flex flex-col md:flex-row gap-6">
            {/* Left Side - Labels and Descriptions */}
            <div className="w-full md:w-1/2 flex flex-col justify-center gap-1">
                {items.map((item, idx) => (
                    <div key={idx} className="pb-1">
                        <button
                            onClick={() => handleLabelClick(idx)}
                            className={`w-full text-left p-1 rounded-lg transition ${
                                current === idx
                                    ? "text-indigo-500 dark:text-white font-semibold"
                                    : "text-gray-400 dark:text-slate-400/40 font-medium"
                            }`}
                        >
                            <p className="text-sm">
                                {item.title || `Slide ${idx + 1}`}
                            </p>
                        </button>
                        {expandedIndex === idx && (
                            <div className={`p-1 text-sm text-gray-600 dark:text-gray-400`}>
                                <p>{item.description || item.text}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Right Side - Image Display */}
            <div className="w-full md:w-1/2">
                <div className="overflow-hidden">
                    {items[current]?.image && (
                        <img
                            src={items[current].image}
                            alt={items[current].title || `Slide ${current + 1}`}
                            className="w-full h-[300px] object-cover rounded-2xl"
                        />
                    )}
                    {/* <div className="p-4">
                        <h3 className="text-xl font-semibold mb-2">
                            {items[current]?.title || `Slide ${current + 1}`}
                        </h3>
                        <p className="text-gray-500">
                            {items[current]?.text}
                        </p>
                    </div> */}
                </div>
            </div>
        </div>
    );
}