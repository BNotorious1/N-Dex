import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Play, X } from "lucide-react";

interface Clip {
  id: number;
  league_id: number;
  team_id: number | null;
  uploaded_by: string;
  title: string;
  description: string | null;
  object_path: string;
  created_at: string;
}

interface Props {
  leagueId: number;
  isMember: boolean;
}

export default function GameplayClips({ leagueId, isMember }: Props) {
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [activeClip, setActiveClip] = useState<Clip | null>(null);

  const { data: clips = [], isLoading } = useQuery<Clip[]>({
    queryKey: ["gameplay-clips", leagueId],
    queryFn: async () => {
      const res = await fetch(`/api/leagues/${leagueId}/clips`);
      if (!res.ok) throw new Error("Failed to fetch clips");
      return res.json();
    },
    enabled: !!leagueId,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Gameplay Clips</span>
        {isMember && (
          <button
            onClick={() => setShowUpload(true)}
            className="text-[9px] font-bold text-[#00C8FF]/70 hover:text-[#00C8FF] transition-colors flex items-center gap-1"
          >
            <Upload className="h-2.5 w-2.5" /> UPLOAD CLIP
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-white/6 bg-[#111] px-4 py-6 text-center">
          <p className="text-xs text-white/25">Loading clips…</p>
        </div>
      ) : clips.length === 0 ? (
        <div className="rounded-xl border border-white/6 bg-[#111] px-4 py-6 text-center">
          <p className="text-xs text-white/25">No gameplay clips yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {clips.map((clip) => (
            <button
              key={clip.id}
              onClick={() => setActiveClip(clip)}
              className="rounded-lg border border-white/8 bg-[#111] overflow-hidden text-left hover:border-[#00C8FF]/25 hover:bg-[#00C8FF]/3 transition-all group"
            >
              <div className="aspect-video bg-black flex items-center justify-center relative">
                <video src={`/api/storage${clip.object_path}`} className="w-full h-full object-cover" preload="metadata" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                  <Play className="h-6 w-6 text-white/80" />
                </div>
              </div>
              <div className="px-2 py-1.5">
                <p className="text-[10px] font-bold text-white truncate">{clip.title}</p>
                <p className="text-[8px] text-white/30 truncate">by {clip.uploaded_by}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {showUpload && (
        <UploadClipModal
          leagueId={leagueId}
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            setShowUpload(false);
            queryClient.invalidateQueries({ queryKey: ["gameplay-clips", leagueId] });
          }}
        />
      )}

      {activeClip && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6" onClick={() => setActiveClip(null)}>
          <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-white">{activeClip.title}</p>
              <button onClick={() => setActiveClip(null)} className="text-white/50 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <video src={`/api/storage${activeClip.object_path}`} controls autoPlay className="w-full rounded-lg" />
            {activeClip.description && <p className="text-xs text-white/50 mt-2">{activeClip.description}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function UploadClipModal({ leagueId, onClose, onUploaded }: { leagueId: number; onClose: () => void; onUploaded: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!file || !title.trim()) {
      setError("Title and a video file are required");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();

      const putRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Failed to upload file");

      const createRes = await fetch(`/api/leagues/${leagueId}/clips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, object_path: objectPath }),
      });
      if (!createRes.ok) throw new Error("Failed to save clip");

      onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6" onClick={onClose}>
      <div className="max-w-md w-full rounded-xl border border-white/10 bg-[#111] p-5" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-bold text-white mb-3">Upload Gameplay Clip</p>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Clip title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-[#00C8FF]/40"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-[#00C8FF]/40"
          />
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-xs text-white/60"
          />
          {error && <p className="text-[10px] text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="text-xs font-bold text-white/40 hover:text-white px-3 py-1.5">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="text-xs font-bold text-black bg-[#00C8FF] hover:bg-[#00C8FF]/80 rounded-md px-3 py-1.5 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
