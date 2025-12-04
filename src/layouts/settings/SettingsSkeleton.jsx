import PageHeaderWrapper from "../../components/skeletons/PageHeaderWrapper.jsx";
import PageSectionWrapper from "../../components/skeletons/PageSectionWrapper.jsx";

export default function SettingsSkeleton({ title, children }) {
    return (
        <div className="flex flex-col flex-1">
            <PageHeaderWrapper>
                <h1 className="text-5xl font-semibold text-black dark:text-white">{title}</h1>
            </PageHeaderWrapper>
            <PageSectionWrapper>
                {children}
            </PageSectionWrapper>
        </div>
    )
}