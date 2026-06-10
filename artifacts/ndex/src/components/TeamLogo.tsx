import { useState } from "react";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
type LogoShape = "circle" | "rounded";

interface Props {
  abbreviation: string;
  primaryColor?: string | null;
  size?: LogoSize;
  shape?: LogoShape;
  className?: string;
  noBg?: boolean;
}

const SIZE_MAP: Record<LogoSize, { container: string; text: string; padding: string }> = {
  xs:  { container: "h-4 w-4",   text: "text-[6px]",  padding: "p-0" },
  sm:  { container: "h-5 w-5",   text: "text-[7px]",  padding: "p-0" },
  md:  { container: "h-6 w-6",   text: "text-[8px]",  padding: "p-px" },
  lg:  { container: "h-8 w-8",   text: "text-[9px]",  padding: "p-0.5" },
  xl:  { container: "h-12 w-12", text: "text-xs",     padding: "p-1" },
  "2xl": { container: "h-20 w-20", text: "text-base",  padding: "p-1.5" },
};

// Abbreviation → ESPN CDN slug overrides where they differ
const ESPN_SLUG: Record<string, string> = {
  WAS: "wsh",
};

function getEspnUrl(abbreviation: string): string {
  const slug = ESPN_SLUG[abbreviation.toUpperCase()] ?? abbreviation.toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${slug}.png`;
}

export default function TeamLogo({
  abbreviation,
  primaryColor,
  size = "md",
  shape = "circle",
  className,
  noBg = false,
}: Props) {
  const [failed, setFailed] = useState(false);
  const { container, text, padding } = SIZE_MAP[size];
  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-lg";
  const outer = `${className ?? container} ${shapeClass} overflow-hidden shrink-0`;

  if (failed) {
    return (
      <div
        className={`${outer} flex items-center justify-center font-black text-white`}
        style={{ backgroundColor: primaryColor ?? "#333" }}
      >
        <span className={`${text} leading-none`}>{abbreviation.slice(0, 2)}</span>
      </div>
    );
  }

  return (
    <div className={`${outer}${noBg ? "" : " bg-[#1a1a1a]"}`}>
      <img
        src={getEspnUrl(abbreviation)}
        alt={abbreviation}
        className={`h-full w-full object-contain ${padding}`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
