import PageHeaderWrapper from "../components/skeletons/PageHeaderWrapper";
import PageSectionWrapper from "../components/skeletons/PageSectionWrapper";

export default function StoreItem() {
    return (
        <div className='flex flex-col h-full'>
            <PageHeaderWrapper>
                <h1 className="text-5xl font-semibold text-black dark:text-white">Item</h1>
                
            </PageHeaderWrapper>
            <PageSectionWrapper>
                hi, this is item 123
            </PageSectionWrapper>
        </div>
    );
}