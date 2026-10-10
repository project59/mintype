import { FileText } from 'lucide-react';
import { getPageTitle } from '../../shared/pageMeta.js';

const renderPageMentionItem = (page) => (
  <>
    <span className="flex w-4 shrink-0 justify-center text-gray-400 dark:text-zinc-500">
      {page.emoji || <FileText size={14} />}
    </span>
    <span className="truncate">{getPageTitle(page)}</span>
  </>
);

export default renderPageMentionItem;
