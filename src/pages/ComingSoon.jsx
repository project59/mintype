export default function ComingSoong() {
    return (
        <div className="flex flex-col gap-8 items-center justify-center h-screen bg-black">
            <h1 className="text-6xl md:text-8xl text-white font-semibold">
                Coming Soon
            </h1>
            <p className="text-gray-400 text-xl">
                This page is under construction
            </p>
            <img className="max-w-xs md:max-w-lg" src="/svgs/construction.svg" alt="construction" />
        </div>
    )
}