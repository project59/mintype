export default function PageHeaderWrapper({ children }) {
    return (
        <div className="p-4 md:p-6 min-h-52 flex flex-col justify-end gap-4 w-full bg-slate-100 dark:bg-[#10101e] relative">
            {children}
        </div>
    );
}