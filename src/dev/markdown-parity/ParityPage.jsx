import { useCallback, useRef, useState } from 'react';
import { createShapeId } from 'tldraw';
import TldrawCanvas from '../../render/whiteboard/TldrawCanvas.jsx';
import { MARKDOWN_SHAPE_TYPE } from '../../utils/constants.js';
import { PARITY_FIXTURE } from './fixture.js';
import { compare, fitGap, snapshot } from './measure.js';

const SHAPE_ID = createShapeId('parity');
const WIDTHS = [520, 300];
const THEMES = ['light', 'dark'];
const CASES = THEMES.flatMap((theme) => WIDTHS.map((width) => ({ theme, width })));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Hidden tabs don't run animation frames, so this also resolves after a short timeout.
const nextFrame = () => Promise.race([new Promise((resolve) => requestAnimationFrame(() => resolve())), sleep(50)]);

const waitFor = async (check, label) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const value = check();
    if (value) return value;
    await sleep(50);
  }
  throw new Error(`Timed out waiting for ${label}`);
};

// Lets fonts, images, node views and async page-link titles finish, and the object's height
// follow its content, before measuring. Measured at 100% zoom, so screen pixels are layout pixels.
const settle = async (frame) => {
  await document.fonts.ready;
  await Promise.all([...frame.querySelectorAll('img')].map((image) => image.decode().catch(() => {})));
  await sleep(250);
  for (let attempt = 0; attempt < 30 && fitGap(frame) !== 0; attempt += 1) await sleep(100);
  await nextFrame();
  await nextFrame();
};

// tldraw delivers store changes on animation frames, which hidden tabs don't run, so the
// objects never switch views there.
const whenVisible = () => (document.visibilityState === 'visible'
  ? Promise.resolve()
  : new Promise((resolve) => {
    const onChange = () => {
      if (document.visibilityState !== 'visible') return;
      document.removeEventListener('visibilitychange', onChange);
      resolve();
    };
    document.addEventListener('visibilitychange', onChange);
  }));

const getFrame = () => document.querySelector(`[data-shape-type="${MARKDOWN_SHAPE_TYPE}"] .tl-html-container`);

// The app's theme hook follows the `dark` class; setting it directly keeps the device's saved
// theme preference untouched.
const applyTheme = (theme) => document.documentElement.classList.toggle('dark', theme === 'dark');

// Places one Markdown object at the top left of the viewport at 100% zoom, optionally editing.
const show = async (editor, { theme = 'light', width = WIDTHS[0], editing = false } = {}) => {
  applyTheme(theme);
  editor.setEditingShape(null);
  editor.selectNone();
  if (editor.getShape(SHAPE_ID)) editor.deleteShapes([SHAPE_ID]);
  editor.createShape({
    id: SHAPE_ID,
    type: MARKDOWN_SHAPE_TYPE,
    x: 0,
    y: 0,
    props: { w: width, markdown: PARITY_FIXTURE },
  });
  editor.setCamera({ x: 24, y: 24, z: 1 });
  const frame = await waitFor(() => getFrame()?.querySelector('.tiptap') && getFrame(), 'the static view');
  await settle(frame);
  if (editing) {
    editor.select(SHAPE_ID);
    editor.setEditingShape(SHAPE_ID);
    await waitFor(() => frame.querySelector('.ProseMirror'), 'the editor');
    await settle(frame);
  }
  return frame;
};

const runCase = async (editor, { theme, width }) => {
  const frame = await show(editor, { theme, width });
  const staticView = snapshot(frame);

  editor.select(SHAPE_ID);
  editor.setEditingShape(SHAPE_ID);
  await waitFor(() => frame.querySelector('.ProseMirror'), 'the editor');
  await settle(frame);
  const editingView = snapshot(frame);

  editor.setEditingShape(null);
  editor.selectNone();
  await waitFor(() => !frame.querySelector('.ProseMirror') && frame.querySelector('.tiptap'), 'the static view to return');
  await settle(frame);
  const afterView = snapshot(frame);

  const diffs = [
    ...[['static', staticView], ['editing', editingView], ['static after editing', afterView]]
      .filter(([, view]) => view.body.fitGap !== 0)
      .map(([name, view]) => `Object height doesn't fit its content (${name}): ${view.body.fitGap > 0 ? `${view.body.fitGap}px too tall` : `${-view.body.fitGap}px too short`}`),
    ...compare(staticView, editingView),
    ...compare(staticView, afterView).map((diff) => `After editing: ${diff}`),
  ];
  return { theme, width, passed: diffs.length === 0, diffs, blocks: staticView.blocks.length, lines: staticView.lines.length };
};

const ParityPage = () => {
  const editorRef = useRef(null);
  const [result, setResult] = useState({ status: 'idle', cases: [] });

  const publish = (next) => {
    window.__markdownParity = { ...window.__markdownParity, ...next };
    setResult(next);
  };

  const run = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;
    if (document.visibilityState !== 'visible') {
      publish({ status: 'waiting', cases: [] });
      await whenVisible();
    }
    publish({ status: 'running', cases: [] });
    const cases = [];
    try {
      for (const options of CASES) {
        cases.push(await runCase(editor, options));
        publish({ status: 'running', cases: [...cases] });
      }
      publish({ status: 'done', passed: cases.every((item) => item.passed), cases });
    } catch (error) {
      publish({ status: 'error', error: error.message, cases });
    }
    await show(editor);
  }, []);

  const handleMount = (editor) => {
    editorRef.current = editor;
    window.__markdownParity = { status: 'idle', run, show: (options) => show(editor, options), editor };
    run();
  };

  return (
    <div className="flex h-screen">
      <TldrawCanvas onMount={handleMount} />
      <aside className="fixed right-3 top-14 z-[1000] max-h-[calc(100vh-7rem)] w-96 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-200">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="text-base font-semibold">Markdown object parity</h1>
          <button
            type="button"
            onClick={run}
            disabled={result.status === 'running' || result.status === 'waiting'}
            className="rounded-md bg-slate-200 px-2.5 py-1 text-xs font-medium hover:bg-slate-300 disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
          >
            {result.status === 'running' ? 'Running…' : 'Run again'}
          </button>
        </div>
        {result.status === 'waiting' && <p className="mb-2 text-amber-700 dark:text-amber-300">Waiting for this tab to be visible: tldraw doesn't update hidden tabs.</p>}
        {result.status === 'error' && <p className="mb-2 text-rose-600">Error: {result.error}</p>}
        {result.status === 'done' && (
          <p className={`mb-2 font-semibold ${result.passed ? 'text-green-700 dark:text-green-400' : 'text-rose-600'}`}>
            {result.passed ? 'All cases match' : 'Static and editing views differ'}
          </p>
        )}
        <ul className="space-y-2">
          {result.cases.map((item) => (
            <li key={`${item.theme}-${item.width}`}>
              <div className="font-medium">
                {item.passed ? '✓' : '✗'} {item.theme}, {item.width}px
                <span className="font-normal text-slate-500"> · {item.blocks} blocks, {item.lines} text lines</span>
              </div>
              {item.diffs.length > 0 && (
                <ul className="ml-4 mt-1 list-disc space-y-0.5 text-xs text-rose-700 dark:text-rose-300">
                  {item.diffs.map((diff) => <li key={diff}>{diff}</li>)}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
};

export default ParityPage;
