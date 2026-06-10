import {
  FileText, Newspaper, Ban, ArrowLeftRight,
  ClipboardList, Repeat2, Trophy, Clock,
  Plug, UserCog, UserPlus, SkipForward,
} from "lucide-react";

const ICON_MAP = {
  FileText, Newspaper, Ban, ArrowLeftRight,
  ClipboardList, Repeat2, Trophy, Clock,
  Plug, UserCog, UserPlus, SkipForward,
};

interface Props {
  icon: keyof typeof ICON_MAP;
  title: string;
  description: string;
}

export default function PlaceholderSection({ icon, title, description }: Props) {
  const Icon = ICON_MAP[icon] ?? Clock;
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-5">
        <Icon className="h-7 w-7 text-white/20" />
      </div>
      <h3 className="text-lg font-bold text-white/60 mb-2">{title}</h3>
      <p className="text-sm text-white/30 max-w-xs">{description}</p>
      <div className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/4 px-4 py-1.5">
        <Clock className="h-3 w-3 text-white/25" />
        <span className="text-[11px] text-white/30">Coming soon</span>
      </div>
    </div>
  );
}
