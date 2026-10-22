import React, { useState } from 'react';
import { Edit, X } from 'lucide-react';
import { extractVideoId, youtubeEmbedUrl } from '../youtubeUtils.js';

const YouTubeView = ({ node, updateAttributes, deleteNode }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(node.attrs.videoId || '');
  const [invalid, setInvalid] = useState(false);
  const videoId = extractVideoId(node.attrs.videoId);

  const handleSave = () => {
    const id = extractVideoId(value);
    setInvalid(!id);
    if (!id) return;
    updateAttributes({ videoId: id });
    setValue(id);
    setIsEditing(false);
  };

  if (isEditing || !videoId) {
    return (
      <div className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg p-4 bg-gray-50 dark:bg-[#1a1f27] my-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">YouTube Video</p>
          {node.attrs.videoId && (
            <button onClick={deleteNode} className="p-1 text-gray-400 hover:text-rose-500">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setInvalid(false);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Paste a YouTube URL or video ID"
            className="baseInput flex-1"
          />
          <button onClick={handleSave} className="btnPrimarySm">
            Save
          </button>
        </div>
        {invalid && <p className="mt-2 text-xs text-rose-500">That doesn't look like a YouTube link or video ID.</p>}
      </div>
    );
  }

  return (
    <div className="youtube-embed my-2 relative group">
      <div className="youtube-iframe-wrap" style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
        <iframe
          src={youtubeEmbedUrl(videoId)}
          title="YouTube video"
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
          frameBorder="0"
          allowFullScreen
        />
      </div>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="bg-black/60 text-white rounded p-1"
          onClick={() => {
            setValue(videoId);
            setIsEditing(true);
          }}
        >
          <Edit size={13} />
        </button>
        <button className="bg-black/60 text-white rounded p-1" onClick={deleteNode}>
          <X size={13} />
        </button>
      </div>
    </div>
  );
};

export default YouTubeView;
