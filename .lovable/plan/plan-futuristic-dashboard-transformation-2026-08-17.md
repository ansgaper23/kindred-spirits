# Plan: Futuristic Dashboard Transformation

Apply a futuristic, "agental" visual style to the dashboard pages (`/dashboard` and `/dashboard/$repositoryId`) to match the home page's aesthetic.

## Proposed Changes

### 1. Global Styles & Theming
- Add futuristic animation keyframes and background patterns to `src/routes/dashboard.tsx` (similar to `src/routes/index.tsx`).
- Introduce ambient background elements (glow orbs, grid fade) to the dashboard layout.
- Update the dashboard header to use the glassmorphism and gradient styles from the home page.

### 2. Repository List Enhancement (`src/routes/dashboard/index.tsx`)
- Transform repository cards into futuristic "nodes" with hover glow effects and glassmorphism backgrounds.
- Update buttons and typography to use the cyan-blue-fuchsia gradient system.
- Add subtle animations to the list entry.

### 3. Chat & Repository Detail Enhancement (`src/routes/dashboard/$repositoryId.tsx` & `src/components/ChatInterface.tsx`)
- Update the repository header and chat container to use the high-contrast, translucent dark theme.
- Enhance reasoning cards and diff blocks with more "agental" styling (glows, mono-fonts, subtle pulse animations).
- Standardize buttons to use the futuristic gradient style.

### 4. Shared Components
- Ensure consistent use of oklch-based semantic tokens while overriding local styles for the "CodeFlow" dark aesthetic.

## Technical Details
- **CSS Transitions:** Use Tailwind's transition utilities for smooth hover states.
- **Glassmorphism:** Use `backdrop-blur-xl` and `bg-slate-900/60` (or similar translucent variants) for containers.
- **Gradients:** Implement the signature `from-cyan-500 to-blue-600` for primary actions.
- **Animations:** Reuse `cf-float`, `cf-blink`, and `cf-pulse-dot` from the landing page.
