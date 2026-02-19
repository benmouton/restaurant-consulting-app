import { Link } from "wouter";

function ChefHatIcon({ size = "sm" }: { size?: "xs" | "sm" | "lg" }) {
  if (size === "xs") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
        <line x1="6" y1="17" x2="18" y2="17" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={size === "lg" ? 1.6 : 1.8} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
      <line x1="6" y1="17" x2="18" y2="17" />
    </svg>
  );
}

export function BrandLogoNav({ linkTo = "/" }: { linkTo?: string }) {
  return (
    <Link href={linkTo} className="flex items-center gap-2.5 no-underline" data-testid="link-brand-logo">
      <div
        className="flex items-center justify-center shrink-0 rounded-full border-[1.5px] border-primary text-primary p-[7px]"
        style={{ width: 36, height: 36 }}
      >
        <ChefHatIcon size="sm" />
      </div>
      <div className="flex flex-col">
        <span className="font-serif text-[15px] font-semibold leading-tight tracking-tight text-foreground">The Restaurant</span>
        <span className="font-sans text-[8.5px] font-semibold uppercase tracking-[2.5px] text-primary">Consultant</span>
      </div>
    </Link>
  );
}

export function BrandLogoFull() {
  return (
    <div className="flex items-center gap-4">
      <div
        className="flex items-center justify-center shrink-0 rounded-full border-2 border-primary text-primary p-[10px]"
        style={{ width: 52, height: 52 }}
      >
        <ChefHatIcon size="lg" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="font-serif text-xl font-semibold leading-tight tracking-tight text-foreground">The Restaurant</span>
        <span className="font-sans text-[11px] font-semibold uppercase tracking-[3px] text-primary">Consultant</span>
      </div>
    </div>
  );
}

export function BrandLogoWithTagline() {
  return (
    <div className="flex flex-col items-center gap-5">
      <BrandLogoFull />
      <p className="font-sans text-sm font-medium text-muted-foreground italic tracking-wide">
        Systems that work on your worst night.
      </p>
    </div>
  );
}

export function BrandLogoIconOnly({ size = 48 }: { size?: number }) {
  const iconSize = size <= 20 ? "xs" : size <= 40 ? "sm" : "lg";
  const borderWidth = size <= 20 ? 1.5 : 2;
  const padding = size <= 20 ? 3 : size <= 40 ? 7 : 10;
  return (
    <div
      className="flex items-center justify-center shrink-0 rounded-full border-primary text-primary"
      style={{ width: size, height: size, borderWidth, padding }}
    >
      <ChefHatIcon size={iconSize} />
    </div>
  );
}

export { ChefHatIcon };
