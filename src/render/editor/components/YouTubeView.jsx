import React, { useState } from 'react';
import { Edit, X } from 'lucide-react';

const YouTubeView = ({ node, updateAttributes, deleteNode }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(node.attrs.videoId || '');

  const handleSave = () => {
    updateAttributes({ videoId: value.trim() });
    setIsEditing(false);
  };

  if (isEditing || !node.attrs.videoId) {
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
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste a YouTube URL or video ID"
            className="baseInput flex-1"
          />
          <button onClick={handleSave} className="btnPrimarySm">
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="youtube-embed my-2 relative group">
      <div className="youtube-iframe-wrap" style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
        <iframe
          src={`https://www.youtube.com/embed/${node.attrs.videoId}`}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
          frameBorder="0"
          allowFullScreen
        />
      </div>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="bg-black/60 text-white rounded p-1"
          onClick={() => {
            setValue(node.attrs.videoId);
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
