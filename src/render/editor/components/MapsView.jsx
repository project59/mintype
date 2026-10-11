import { useState } from 'react';
import { Edit, Loader2, MapPin, X } from 'lucide-react';
import { getGoogleMapsEmbedUrl, isShortMapsLink, resolveShortMapsLink } from '../mapsUtils.js';

const MapsView = ({ node, updateAttributes, deleteNode }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [url, setUrl] = useState(node.attrs.url || '');
  const [resolving, setResolving] = useState(false);
  const [resolveFailed, setResolveFailed] = useState(false);
  const embedUrl = getGoogleMapsEmbedUrl(node.attrs.url);

  // Short links are stored as the full URL they point to, so the block never needs resolving again.
  const handleSave = async () => {
    if (resolving) return;
    let fullUrl = url.trim();
    if (isShortMapsLink(fullUrl)) {
      setResolving(true);
      fullUrl = await resolveShortMapsLink(fullUrl);
      setResolving(false);
      setResolveFailed(!fullUrl);
    }
    if (!getGoogleMapsEmbedUrl(fullUrl)) return;
    updateAttributes({ url: fullUrl });
    setUrl(fullUrl);
    setIsEditing(false);
  };

  if (isEditing || !embedUrl) {
    return (
      <div className="my-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 dark:border-slate-700 dark:bg-[#1a1f27]">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs text-gray-500"><MapPin size={13} /> Google Maps</p>
          {node.attrs.url && (
            <button type="button" aria-label="Delete map block" onClick={deleteNode} className="p-1 text-gray-400 hover:text-rose-500">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setResolveFailed(false);
            }}
            onKeyDown={(event) => event.key === 'Enter' && handleSave()}
            placeholder="Paste a Google Maps URL"
            aria-label="Google Maps URL"
            className="baseInput flex-1"
          />
          <button type="button" onClick={handleSave} disabled={resolving} className="btnPrimarySm gap-1.5">
            {resolving && <Loader2 className="animate-spin" size={12} />}
            Save
          </button>
        </div>
        {resolveFailed ? (
          <p className="mt-2 text-xs text-rose-500">Could not open this share link. Open it and paste the full address from your browser instead.</p>
        ) : url && !isShortMapsLink(url) && !getGoogleMapsEmbedUrl(url) && (
          <p className="mt-2 text-xs text-rose-500">Enter a valid Google Maps URL.</p>
        )}
      </div>
    );
  }

  return (
    <div className="group relative my-2 overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-700">
      <iframe
        src={embedUrl}
        title="Google Maps location"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        className="aspect-[4/3] w-full border-0 md:aspect-video"
      />
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          aria-label="Edit map URL"
          className="rounded bg-black/60 p-1 text-white"
          onClick={() => {
            setUrl(node.attrs.url);
            setIsEditing(true);
          }}
        >
          <Edit size={13} />
        </button>
        <button type="button" aria-label="Delete map block" className="rounded bg-black/60 p-1 text-white" onClick={deleteNode}>
          <X size={13} />
        </button>
      </div>
    </div>
  );
};

export default MapsView;
