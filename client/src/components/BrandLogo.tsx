import { Link } from "wouter";
import logoImage from "@assets/ChatGPT_Image_Feb_19,_2026,_07_41_00_AM_1771508472115.png";

export function BrandLogoNav({ linkTo = "/" }: { linkTo?: string }) {
  return (
    <Link href={linkTo} className="flex items-center gap-2.5 no-underline" data-testid="link-brand-logo">
      <img src={logoImage} alt="The Restaurant Consultant" className="h-9 w-auto object-contain shrink-0" />
    </Link>
  );
}

export function BrandLogoFull() {
  return (
    <div className="flex items-center gap-4">
      <img src={logoImage} alt="The Restaurant Consultant" className="h-14 w-auto object-contain shrink-0" />
    </div>
  );
}

export function BrandLogoWithTagline() {
  return (
    <div className="flex flex-col items-center gap-5">
      <img src={logoImage} alt="The Restaurant Consultant" className="h-16 w-auto object-contain" />
      <p className="text-sm font-medium text-muted-foreground italic tracking-wide">
        Systems that work on your worst night.
      </p>
    </div>
  );
}
