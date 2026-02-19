# REBRAND: The Restaurant Consultant — "Systems that work on your worst night"

The app is being rebranded from "Restaurant AI Consulting" / "Restaurant Operations Consulting" to **The Restaurant Consultant** with the tagline **"Systems that work on your worst night."**

This rebrand includes: new name everywhere, new logo SVG files, new tagline, removal of ALL remaining AI references, and updated meta tags.

---

## 1. Replace the Logo

Three SVG files are provided. Place them in the `public/` folder (or wherever your current logo lives):

- **logo-full.svg** — Full logo with chef hat emblem + "The Restaurant / CONSULTANT" text. Use in the navigation bar and anywhere the logo appears with text.
- **logo-icon.svg** — Chef hat emblem only (no text). Use as favicon, apple-touch-icon, and app icon.
- **logo-with-tagline.svg** — Full logo + tagline "Systems that work on your worst night." Use on the landing page and marketing contexts only.

### Implementation:
- Replace the current logo in the nav bar component with `logo-full.svg`
- Scale the nav logo so the emblem circle is roughly 32-36px tall
- Replace `favicon.png` with a PNG export of `logo-icon.svg` at 32x32 and 16x16
- Replace `apple-touch-icon.png` with a PNG export of `logo-icon.svg` at 180x180
- On the landing page header, use `logo-full.svg` (not the tagline version — the tagline appears separately in the hero)

---

## 2. Update ALL Brand Name References

### Global find-and-replace across the entire codebase:

| Find | Replace With |
|------|-------------|
| `Restaurant AI Consulting` | `The Restaurant Consultant` |
| `Restaurant Operations Consulting` | `The Restaurant Consultant` |
| `AI Consultant` | `The Consultant` |
| `AI consultant` | `the consultant` |

### Specific files to update:

**index.html:**
```html
<title>The Restaurant Consultant</title>
<meta name="description" content="Systems that work on your worst night. A hands-on restaurant consulting platform built by real service, real payroll, real guests, and real consequences." />
<meta name="apple-mobile-web-app-title" content="The Restaurant Consultant" />
```

**manifest.json:**
```json
{
  "name": "The Restaurant Consultant",
  "short_name": "TRC",
  "description": "Systems that work on your worst night"
}
```

**Landing page** (`src/pages/landing.tsx`):
- Nav logo: Use `logo-full.svg`
- The hero can keep "Replace Chaos with Systems" as the headline
- Add the tagline "Systems that work on your worst night" somewhere prominent — either as the hero subtitle or below the CTA
- Bottom CTA section: Update any old brand name references

**Nav bar component:**
- Replace the current logo/text with the `logo-full.svg` file
- Make sure it links to `/` (home)

**Footer:**
- Update any brand name in the footer
- Add: "© 2026 The Restaurant Consultant. All rights reserved."

**Email templates / notification text:**
- If any emails are sent (invitations, password resets, etc.), update the brand name

---

## 3. Remove ALL Remaining AI References

Do a global search for each of these terms and fix any remaining instances. Some of these were flagged in previous prompts but may not have been caught yet:

### Text content to find and replace:

| Find | Replace With |
|------|-------------|
| `The AI will convert this` | `This will be converted` |
| `The AI converts it` | `This converts your description` |
| `AI-Powered SOP Capture` | `SOP Capture Engine` |
| `AI-powered` | Remove, or replace with `personalized` / `tailored` / `expert` |
| `AI will use generic industry defaults` | `generic industry defaults will be used` |
| `AI Assistant` (button on Social Media page) | `Writing Assistant` |
| `AI Consultant` (dashboard bottom section) | `Operations Consultant` or `The Consultant` |
| `powered by AI` | `built by operators` |
| `AI-generated` | `custom` or `tailored` |

### Global search terms to catch stragglers:
```
Search for (case-sensitive): "AI" (as a standalone word, not inside other words like "WAIT" or "CHAIR")
Search for: "artificial"
Search for: "machine learning"  
Search for: "GPT"
Search for: "LLM"
Search for: "language model"
Search for: "powered by"
```

### Exceptions — DO NOT remove:
- Internal code comments about AI/LLM integration (backend, invisible to users)
- API route names or variable names (invisible to users)
- Privacy policy / terms of service disclosures about AI usage (legally required)

---

## 4. Update the Tagline Everywhere

The official tagline is: **"Systems that work on your worst night"**

Use it in:
- Landing page (below the hero headline or as a subtitle)
- Meta description tag
- manifest.json description
- Any marketing or social share contexts
- The landing page bottom CTA section: "Systems that work on your worst night. $10/month. No contracts."

The previous taglines "Replace chaos with systems" can still be used as a headline — it's great. But "Systems that work on your worst night" is the official brand tagline that appears with the logo.

---

## 5. Update the Consultant Page

**File:** `src/pages/consultant.tsx`

- Page header: Change from "AI Consultant" to **"The Consultant"**
- The centered title "Ask the Consultant" is perfect — keep it
- Subtitle: Keep "Ask anything about restaurant operations. You'll get direct, practical answers—no fluff, no theory, just what works on a real floor."
- Chat input placeholder: Should say `Ask about any operational challenge...` not anything mentioning AI
- Any loading/thinking states: Use `Thinking...` or `Working on it...` — never `AI is generating...`
- The consultant's responses should never include phrases like "As an AI..." or "I'm an AI assistant..." — the voice should be an experienced operator

---

## 6. Update the Nav Item

- If the nav still shows "Ask Consultant" → change to just **"Consultant"**
- If the nav was consolidated per previous prompts (Resources, Tools, Consultant), keep "Consultant" as the standalone nav item

---

## 7. Verify These Pages Are Clean

After making all changes, manually check each of these pages for any remaining AI references:
- Landing page
- Dashboard
- All 12 domain pages (especially SOPs & Scalability, HR & Documentation)
- Consultant page
- Certification page (Standards tab warning banner)
- Social Media page (the assistant button)
- Training Templates (generated content)
- Subscription/pricing page
- Profile/account settings

---

## Summary

**Brand name:** The Restaurant Consultant
**Tagline:** Systems that work on your worst night
**Logo files:** logo-full.svg, logo-icon.svg, logo-with-tagline.svg
**Core rule:** The word "AI" should never appear anywhere a user can see it. The technology is invisible. The expertise is the product.
