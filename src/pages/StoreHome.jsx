import { ArrowRight } from "lucide-react";
import PageHeaderWrapper from "../components/skeletons/PageHeaderWrapper";
import PageSectionWrapper from "../components/skeletons/PageSectionWrapper";
import { Link } from "react-router-dom";

export default function StoreHome() {
    return (
        <div className='flex flex-col h-full'>
            <PageHeaderWrapper>
                <h1 className="text-5xl font-semibold text-black dark:text-white">Store</h1>
                <Link to={`/tokens`} className="btnSecondary w-fit">
                    Get Tokens
                </Link>
            </PageHeaderWrapper>
            <PageSectionWrapper>
                <div className="flex gap-2">
                    <button className="btnSecondary">
                        Sort By
                    </button>
                    <button className="btnSecondary">
                        Trending
                    </button>
                </div>
                <div className="flex">
                    <Link to={`/store/234`} className="relative group w-full flex flex-col justify-between md:min-w-52 max-w-72 h-72 rounded-xl overflow-hidden"
                        key={'234'}>

                        <div className="">
                            <div className="absolute h-72 w-full bg-gray-900"></div>
                        </div>
                        <div className="flex items-center justify-center absolute top-2 right-2 rounded-full bg-blue-500 font-semibold text-xs w-8 h-8">
                            1 M
                        </div>

                        <div className="flex justify-between items-end absolute bottom-0 left-0 right-0 p-3">
                            <div className="flex flex-col gap-1 flex-1">
                                <h2 className="text-white font-semibold text-2xl">Maths Graphs Sticker Set</h2>
                                <span className="text-xs text-gray-200">
                                    12/12/12
                                </span>
                            </div>
                            <div className="w-10 h-10 flex items-center justify-center bg-teal-200 rounded-full group-hover:translate-x-1 duration-200">
                                <ArrowRight size={18} className="text-black" />
                            </div>
                        </div>
                    </Link>
                </div>
            </PageSectionWrapper>
        </div>
    );
}