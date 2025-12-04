export default function FeatCard({ img, title, description }) {
    return (
        <div className="rounded-lg flex flex-col justify-between items-start gap-3 h-60 p-4 hover:bg-indigo-100 duration-200 bg-slate-50 dark:bg-[#1f1f2d]">
            <img className="h-14" src={img} alt="lock" />
            <div className="space-y-2">
                <h3 className="font-semibold text-xl text-black dark:text-white">{title}</h3>
                <p className="text-slate-700 dark:text-slate-300 text-sm">{description}</p>
            </div>
        </div>
    )
}