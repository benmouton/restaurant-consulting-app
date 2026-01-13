## Packages
framer-motion | Complex UI animations and transitions
react-markdown | Rendering Markdown in AI chat responses
clsx | Conditional class names utility
tailwind-merge | Merging Tailwind classes safely
date-fns | Date formatting for chat timestamps

## Notes
- Chat uses SSE (Server-Sent Events) style streaming via POST /api/conversations/:id/messages
- Auth is handled via Replit Auth (useAuth hook)
- Manual sections require 'ALL', 'FOH', 'BOH' filtering
