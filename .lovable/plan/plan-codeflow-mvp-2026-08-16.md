# Plan - CodeFlow MVP

Building the MVP of CodeFlow: a platform for AI-driven code edits with user approval.

## User Requirements
- **Core Loop**: User describes change -> Agent explores/proposes -> User reviews diff -> Approval applies changes (PR/Branch).
- **AI**: Gemini API with function calling (Tool Use).
- **GitHub**: GitHub App integration (isolated sandbox per session).
- **Sandbox**: Isolated execution (e2b.dev).
- **Stack**: TanStack Start (React 19, Vite) + Lovable Cloud (PostgreSQL/Auth).

## Proposed Changes

### 1. Infrastructure & Backend
- Enable Lovable Cloud for authentication and database persistence.
- Create `src/lib/agent/gemini.functions.ts` to handle the agent loop and Gemini API calls.
- Create tool definitions for `read_file`, `list_files`, `search_code`, and `propose_edit`.
- Implement a mock sandbox manager in `src/lib/sandbox/e2b.server.ts` that will eventually connect to e2b.dev.
- Implement GitHub App logic in `src/lib/github/client.server.ts` (initially mocked).

### 2. Database Schema
- Define tables:
  - `profiles`: User profiles linked to GitHub IDs.
  - `repositories`: Connected repos (owner, repo, installation_id).
  - `conversations`: Chat history between user and agent.
  - `proposed_edits`: Stored diffs pending approval.

### 3. Frontend Development
- **Home/Dashboard**: View for connecting repositories and selecting active projects.
- **Chat Interface**: 
  - Streaming messages.
  - Status indicators for "Agent thinking" or "Tool calling".
- **Diff Viewer**: 
  - Side-by-side or unified diff representation.
  - Inline approval/rejection of changes.

### 4. Integration
- Connect the frontend chat to the server functions.
- Implement the "Apply Changes" flow: committing to a new branch and opening a PR.

## Technical Details
- **Gemini**: Use `google-generative-ai` or AI Gateway for model interaction.
- **Auth**: Lovable Cloud (Supabase) with GitHub OAuth.
- **Styling**: Tailwind CSS v4 + Shadcn UI components.
- **Data Flow**: TanStack Query for state management and Server Functions for backend logic.
