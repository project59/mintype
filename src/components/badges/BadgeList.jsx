import badgeCatalog from "./badgeCatalog";

const BadgeList = ({ badgeIds }) => {
    console.log(badgeIds);
    return (
        <div className="flex gap-2 text-black dark:text-white">
            {badgeIds.map(badge => {
                const result = badgeCatalog[badge.id];
                if (!badge) return null;
                return (
                    <div key={badge} className="flex items-center gap-1">
                        <img className="w-12 h-12 rounded-xl" src={result?.icon || 'https://placehold.co/40x40'} alt={result?.name} />
                        <span>{result?.name}</span>
                    </div>
                );
            })}
        </div>
    );
};

export default BadgeList;