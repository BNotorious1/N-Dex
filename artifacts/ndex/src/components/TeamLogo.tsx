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

const SIZE_MAP: Record<LogoSize, { container: string; text: string }> = {
  xs:    { container: "h-4 w-4",   text: "text-[6px]"  },
  sm:    { container: "h-5 w-5",   text: "text-[7px]"  },
  md:    { container: "h-6 w-6",   text: "text-[8px]"  },
  lg:    { container: "h-8 w-8",   text: "text-[9px]"  },
  xl:    { container: "h-12 w-12", text: "text-xs"     },
  "2xl": { container: "h-20 w-20", text: "text-base"   },
};

// Abbreviation → ESPN CDN slug overrides where they differ
const ESPN_SLUG: Record<string, string> = {
  WAS: "wsh",
  ARZ: "ari",
  AZ:  "ari",
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
}: Props) {
  const [failed, setFailed] = useState(false);
  const { container, text } = SIZE_MAP[size];
  const sizeClass = className ?? container;
  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-lg";

  if (failed) {
    return (
      <div
        className={`${sizeClass} ${shapeClass} flex items-center justify-center font-black text-white shrink-0`}
        style={{ backgroundColor: primaryColor ?? "#333" }}
      >
        <span className={`${text} leading-none`}>{abbreviation.slice(0, 2)}</span>
      </div>
    );
  }

  return (
    <img
      src={getEspnUrl(abbreviation)}
      alt={abbreviation}
      className={`${sizeClass} object-contain shrink-0`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
