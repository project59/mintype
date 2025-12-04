export default function PageSectionWrapper({ children }) {
    return (
        <div className="flex flex-col gap-8 p-4 md:p-6 w-full flex-1 rounded-t-2xl bg-white dark:bg-[#1f1f2d] z-10">
            {children}
        </div>
    );
}