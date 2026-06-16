import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  subtitle?: string;
  className?: string;
}

const sizes = {
  sm: { box: "h-7 w-7", image: 28, text: "text-sm" },
  md: { box: "h-9 w-9", image: 36, text: "text-sm" },
  lg: { box: "h-11 w-11", image: 44, text: "text-base" },
};

export function Logo({ size = "md", showText = true, subtitle, className }: LogoProps) {
  const s = sizes[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-lg bg-white p-1.5 shadow-sm",
          s.box
        )}
      >
        <Image
          src="/northops-icon.png"
          alt="NorthOps"
          width={s.image}
          height={s.image}
          className="h-full w-full object-contain"
          priority
        />
      </div>
      {showText && (
        <div>
          <p className={cn("font-semibold tracking-tight text-white", s.text)}>NorthOps</p>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      )}
    </div>
  );
}
