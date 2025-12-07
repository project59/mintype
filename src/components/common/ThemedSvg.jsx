export default function ThemedSvg({ url }) {
    return (
        <div className="h-full">
            <img className="dark:hidden h-full" src={`/svgs/${url}.svg`} alt={url} />
            <img className="hidden dark:block h-full" src={`/svgs/${url}-dark.svg`}  alt={url} />
        </div>
    )
}