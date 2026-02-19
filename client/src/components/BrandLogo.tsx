import { Link } from "wouter";
import logoImage from "@/assets/logo.png";

export function BrandLogoNav({ linkTo = "/" }: { linkTo?: string }) {
  return (
    <Link href={linkTo} className="flex items-center gap-2.5 no-underline" data-testid="link-brand-logo">
      <img src={logoImage} alt="The Restaurant Consultant" className="h-9 w-9 rounded-lg object-contain shrink-0 ring-1 ring-primary/20" />
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
      <img src={logoImage} alt="The Restaurant Consultant" className="h-12 w-12 rounded-lg object-contain shrink-0 ring-1 ring-primary/20" />
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
