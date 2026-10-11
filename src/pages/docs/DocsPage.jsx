import { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ArrowLeft, ArrowRight, ChevronDown, Github } from 'lucide-react';
import StaticMarkdownRenderer from '../../render/shared/read-only/StaticMarkdownRenderer.jsx';
import ThemeToggleBtn from '../../components/common/ThemeToggleBtn.jsx';
import { SOURCE_URL, adjacentDocs, docPath, docsNav, getDoc, headingId, resolveDocHref } from './docsContent.js';

function DocsNav({ onNavigate }) {
    return (
        <nav className="flex flex-col gap-5 text-sm">
            {docsNav.map((section) => (
                <div key={section.title || 'top'} className="flex flex-col gap-0.5">
                    {section.title && (
                        <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{section.title}</p>
                    )}
                    {section.items.map((item) => (
                        <NavLink
                            key={item.slug}
                            to={docPath(item.slug)}
                            end
                            onClick={onNavigate}
                            className={({ isActive }) => `rounded-lg px-2 py-1.5 duration-150 ${isActive
                                ? 'bg-emerald-100 font-medium text-emerald-950 dark:bg-emerald-400/15 dark:text-emerald-100'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}`}
                        >
                            {item.title}
                        </NavLink>
                    ))}
                </div>
            ))}
        </nav>
    );
}

function PagerLink({ doc, direction }) {
    if (!doc) return <div className="flex-1" />;
    const next = direction === 'next';
    return (
        <Link
            to={docPath(doc.slug)}
            className={`flex flex-1 flex-col gap-1 rounded-xl border border-gray-200 p-3 duration-150 hover:border-emerald-400 dark:border-white/10 dark:hover:border-emerald-400/60 ${next ? 'items-end text-right' : ''}`}
        >
            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                {!next && <ArrowLeft size={12} />}
                {next ? 'Next' : 'Previous'}
                {next && <ArrowRight size={12} />}
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{doc.title}</span>
        </Link>
    );
}

export default function DocsPage() {
    const { slug = '' } = useParams();
    const { hash } = useLocation();
    const navigate = useNavigate();
    const contentRef = useRef(null);
    const doc = getDoc(slug);
    const { previous, next } = adjacentDocs(slug);

    useEffect(() => {
        const previousTitle = document.title;
        document.title = doc?.slug ? `${doc.title} · Mintype Docs` : 'Mintype Docs';
        return () => {
            document.title = previousTitle;
        };
    }, [doc]);

    // The Markdown is written for GitHub, so headings get GitHub's anchors and relative links are
    // pointed at the matching doc or repository file once the page is rendered.
    useEffect(() => {
        const container = contentRef.current;
        if (!container || !doc) return;
        const used = new Set();
        container.querySelectorAll('h1, h2, h3, h4').forEach((heading) => {
            heading.id = headingId(heading.textContent, used);
        });
        container.querySelectorAll('a[href]').forEach((anchor) => {
            const { href, external, internal } = resolveDocHref(anchor.getAttribute('href'));
            anchor.setAttribute('href', href);
            anchor.toggleAttribute('data-doc-link', Boolean(internal) || href.startsWith('#'));
            if (external) {
                anchor.target = '_blank';
                anchor.rel = 'noopener noreferrer';
            }
        });
    }, [doc]);

    useEffect(() => {
        const target = hash && document.getElementById(decodeURIComponent(hash.slice(1)));
        if (target) target.scrollIntoView();
        else window.scrollTo(0, 0);
    }, [slug, hash]);

    const handleContentClick = (event) => {
        const anchor = event.target.closest('a[data-doc-link]');
        if (!anchor || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        navigate(anchor.getAttribute('href'));
    };

    return (
        <div className="flex min-h-screen flex-col bg-white text-gray-900 dark:bg-[#10101e]">
            <header className="sticky top-0 z-30 border-b border-gray-200/60 bg-white/80 px-4 backdrop-blur-sm dark:border-white/5 dark:bg-[#10101e]/80">
                <nav className="mx-auto flex max-w-screen-xl items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                        <img className="h-5" src="/favicon.svg" alt="" />
                        <span className="text-xl font-semibold text-black dark:text-white">Mintype</span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-100">Docs</span>
                        <ThemeToggleBtn />
                    </div>
                    <div className="flex items-center gap-3">
                        <a
                            href="https://github.com/project59/mintype"
                            className="hidden items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 sm:flex dark:text-gray-400 dark:hover:text-white"
                        >
                            <Github size={16} />
                            GitHub
                        </a>
                        <Link to="/workspace" className="btnPrimary !h-8 !px-3 !text-sm">Open app</Link>
                    </div>
                </nav>
            </header>

            <Disclosure as="div" className="border-b border-gray-200/60 px-4 md:hidden dark:border-white/5">
                {({ close }) => (
                    <>
                        <DisclosureButton className="group flex w-full items-center justify-between py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {doc?.title || 'Browse docs'}
                            <ChevronDown size={16} className="duration-200 group-data-[open]:rotate-180" />
                        </DisclosureButton>
                        <DisclosurePanel className="pb-4">
                            <DocsNav onNavigate={() => close()} />
                        </DisclosurePanel>
                    </>
                )}
            </Disclosure>

            <div className="mx-auto flex w-full max-w-screen-xl flex-1 gap-10 px-4">
                <aside className="hidden w-60 shrink-0 md:block">
                    <div className="sticky top-[57px] max-h-[calc(100vh-57px)] overflow-y-auto py-8">
                        <DocsNav />
                    </div>
                </aside>

                <main className="min-w-0 max-w-3xl flex-1 py-8 md:py-10">
                    {doc ? (
                        <>
                            <div ref={contentRef} onClick={handleContentClick} className="[&_h1]:scroll-mt-20 [&_h2]:!mt-10 [&_h2]:scroll-mt-20 [&_h3]:!mt-7 [&_h3]:scroll-mt-20 [&_h4]:scroll-mt-20">
                                <StaticMarkdownRenderer key={doc.slug} markdown={doc.markdown} />
                            </div>
                            <div className="mt-12 flex gap-3">
                                <PagerLink doc={previous} direction="previous" />
                                <PagerLink doc={next} direction="next" />
                            </div>
                            <a
                                href={`${SOURCE_URL}docs/${doc.file}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                            >
                                <Github size={14} />
                                View this page on GitHub
                            </a>
                        </>
                    ) : (
                        <div className="flex flex-col items-start gap-3 py-16">
                            <h1 className="text-2xl font-semibold">Page not found</h1>
                            <p className="text-gray-600 dark:text-gray-400">There is no docs page at this address.</p>
                            <Link to="/docs" className="btnPrimary">Go to the docs home</Link>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
