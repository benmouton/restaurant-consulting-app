import { Link } from "wouter";

function ChefHatIcon({ size = "sm" }: { size?: "sm" | "lg" | "xs" }) {
  const color = "hsl(var(--primary))";

  if (size === "xs") {
    return (
      <span className="relative inline-block" style={{ width: 8, height: 8 }}>
        <span className="absolute top-0 left-0" style={{ width: 8, height: 5, border: `1px solid ${color}`, borderRadius: "4px 4px 1px 1px", borderBottom: "none" }} />
        <span className="absolute left-0" style={{ top: 4.5, width: 8, height: 1, background: color }} />
        <span className="absolute left-[1px]" style={{ top: 5.5, width: 6, height: 2.5, border: `1px solid ${color}`, borderTop: "none", borderRadius: "0 0 2px 2px" }} />
      </span>
    );
  }

  if (size === "lg") {
    return (
      <span className="relative inline-block" style={{ width: 26, height: 24 }}>
        <span className="absolute top-0 left-[2px]" style={{ width: 22, height: 16, border: `2px solid ${color}`, borderRadius: "11px 11px 4px 4px", borderBottom: "none" }} />
        <span className="absolute left-0" style={{ top: 14, width: 26, height: 2, background: color, borderRadius: 1 }} />
        <span className="absolute left-[4px]" style={{ top: 16, width: 18, height: 8, border: `2px solid ${color}`, borderTop: "none", borderRadius: "0 0 4px 4px" }} />
      </span>
    );
  }

  return (
    <span className="relative inline-block" style={{ width: 18, height: 17 }}>
      <span className="absolute top-0 left-[1px]" style={{ width: 16, height: 11, border: `1.5px solid ${color}`, borderRadius: "8px 8px 3px 3px", borderBottom: "none" }} />
      <span className="absolute left-0" style={{ top: 10, width: 18, height: 1.5, background: color, borderRadius: 1 }} />
      <span className="absolute left-[3px]" style={{ top: 11.5, width: 12, height: 5.5, border: `1.5px solid ${color}`, borderTop: "none", borderRadius: "0 0 3px 3px" }} />
    </span>
  );
}

export function BrandLogoNav({ linkTo = "/" }: { linkTo?: string }) {
  return (
    <Link href={linkTo} className="flex items-center gap-2.5 no-underline" data-testid="link-brand-logo">
      <div
        className="flex items-center justify-center shrink-0 rounded-full border-[1.5px] border-primary"
        style={{ width: 36, height: 36 }}
      >
        <ChefHatIcon size="sm" />
      </div>
      <div className="flex flex-col">
        <span className="font-serif text-[15px] font-semibold leading-tight tracking-tight">The Restaurant</span>
        <span className="text-[8.5px] font-semibold uppercase tracking-[2.5px] text-primary">Consultant</span>
      </div>
    </Link>
  );
}

export function BrandLogoFull() {
  return (
    <div className="flex items-center gap-4">
      <div
        className="flex items-center justify-center shrink-0 rounded-full border-2 border-primary"
        style={{ width: 52, height: 52 }}
      >
        <ChefHatIcon size="lg" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="font-serif text-xl font-semibold leading-tight tracking-tight">The Restaurant</span>
        <span className="text-[11px] font-semibold uppercase tracking-[3px] text-primary">Consultant</span>
      </div>
    </div>
  );
}

export function BrandLogoWithTagline() {
  return (
    <div className="flex flex-col items-center gap-5">
      <BrandLogoFull />
      <p className="text-sm font-medium text-muted-foreground italic tracking-wide">
        Systems that work on your worst night.
      </p>
    </div>
  );
}

export { ChefHatIcon };
