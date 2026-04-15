# 💻 Developer Code Documentation

This document serves as a comprehensive map of the Helpdesk source code. It outlines every critical file, its core responsibilities, state management strategies, and how the files interconnect within the React component tree.

---

## 📁 Source Code Directory Structure

The project strictly follows the standard SPFx pattern, where the `src/` directory holds the buildable TypeScript and SCSS bundles.

```text
src/
├── services/
│   └── SPService.ts                    // Singleton class for all PnPjs API routing
├── webparts/
│   ├── adminHelpdesk/components/       // Admin Portal App
│   │   ├── AdminDashboard.tsx
│   │   ├── TicketManagement.tsx
│   │   ├── UserManagement.tsx
│   │   └── *.module.scss               // Scoped CSS for Admin
│   ├── agenthuman/components/          // Support Agent Portal App
│   │   ├── AgentHuman.tsx
│   │   ├── AgentHumanTicketDetails.tsx
│   │   └── AgentHuman.module.scss      // Scoped CSS for Agent
│   └── helpdesk/components/            // End User Portal App
│       ├── Helpdesk.tsx                // Parent Mount
│       ├── HelpdeskDashboard.tsx       
│       ├── TicketForm.tsx
│       ├── UserTicketDetails.tsx
│       ├── ChatbotInterface.tsx
│       └── *.module.scss               // Scoped CSS for Users
```

---

## 🏗️ 1. REST API & Data Service (`SPService.ts`)

> [!NOTE]
> The `SPService.ts` file acts as the single source of truth for all network HTTP/REST requests. It abstracts PnPjs SharePoint queries so that React components remain entirely decoupled from database logic.

**Initialization**: Instantiated once per Web Part load cycle utilizing `this.context`. It constructs the `spfi()` object targeting the current Web context.

### 📋 Available Endpoints & Methods

| Method / Endpoint | Purpose | Payload / Parameters | Return Type / Result |
| :--- | :--- | :--- | :--- |
| **`getAllTickets()`** | Fetches the global ledger of all tickets. Used primarily by Admin/Agent dashboards. | None | `Promise<any[]>` (Rows from `ticket` list, joined with `Author` lookup titles) |
| **`getUserTickets(userId)`** | Fetches tickets exclusively assigned to or created by a specific user. | `userId: number` | `Promise<any[]>` (Filtered using `Author/Id eq userId`) |
| **`createTicket(payload, attachment)`** | Pushes a new ticket record into the database and uploads any attached files into the list item. | `ticketDetails: object`, `attachment?: File` | `Promise<number>` (Resolves with new Ticket ID) |
| **`updateTicket(ticketId, data)`** | Performs a partial REST update (PATCH) to mutate fields like Status or Category. | `ticketId: number`, `payload: object` | `Promise<void>` |
| **`getComments(ticketId)`** | Selects relational chat messages for a specific ticket, ordered by creation date ascending. | `ticketId: number` | `Promise<any[]>` |
| **`addComment(ticketId, text)`** | Pushes a new text message associated with a Ticket ID to the `ticket_comments` list. | `ticketId: number`, `text: string` | `Promise<void>` |

> [!TIP]
> **Performance Optimization:** Many of these REST wrappers use `$select` to restrict payload bloat and `$expand` to eagerly load lookup fields, resulting in a single efficient HTTP network ping.

---

## 🖥️ 2. User Portal (`helpdesk/components`)

### `Helpdesk.tsx` (Entry Matrix)
*   **Props Received**: `description`, `isDarkTheme`, `environmentMessage`, `hasTeamsContext`, `userDisplayName`, and the injected `spService`.
*   **State**: Controls the highest-level Single Page App routing logic using `[showForm, setShowForm]` and conditionally caches `[formDefaults, setFormDefaults]` emitted by the chatbot.

### `HelpdeskDashboard.tsx`
*   **Purpose**: Renders the User's KPI grid (Active/Resolved) and acts as an interlocking hub.
*   **Interaction Flow**: 
    1. If a user clicks a row in the "My Recent Requests" table, the component forces `setSelectedTicketId(row.Id)`.
    2. React conditional rendering intercepts this state mutation and entirely replaces the raw Dashboard DOM with `<UserTicketDetails />` mapped to that `ticketId`.
    3. If the user focuses on the main search bar, it intercepts the `onChange` event, sets `showChat` to `true`, and injects `<ChatbotInterface />` over the active DOM.

### `ChatbotInterface.tsx`
*   **Purpose**: Triage engine simulating conversational AI.
*   **State Loop**: Maps over an array of `IMessage` interfaces `[{ text, isUser, timestamp }]`. 
*   **The Triage Engine (`handleSend`)**: Once the user types string keywords like `"broken"` or `"password"`, a massive string analysis engine overrides static logic and sets internal suggestions array buffers `[{ category: 'IT', priority: 'High', title: ... }]`. If the user hits "Accept & Create Ticket", the payload bubbles up via the `onHandoff` prop back to `Helpdesk.tsx`.

### `TicketForm.tsx`
*   **Purpose**: The actual form interface rendering input arrays relying on `@fluentui/react` constructs.
*   **Props Received**: The crucial `initialData?: ITicketDefaults` payload from the Chatbot.
*   **Submission**: Maps `[category, setCategory]`, `[priority, setPriority]`, etc., binds trailing File arrays, triggers `spService.createTicket()`, and redirects.

### `UserTicketDetails.tsx` (Optimistic Chat Engine)
*   **Mount Sequence**: Triggers `loadData()` instantly drawing raw SharePoint rows. Simultaneously triggers an interval `5000ms` pinging `spService.getComments()`.
*   **Real-time Algorithm**: Iterates the `comments` array. Performs a runtime evaluation against `this.context.pageContext.user.displayName` (bound as `currentUserTitle`). If `comment.Author.Title === currentUserTitle`, it synthetically injects `.currentUserComment` appending the Blue CSS styling.

---

## 🛡️ 3. Agent Portal (`agenthuman/components`)

### `AgentHuman.tsx`
*   **Purpose**: Identical SPA routing logic to `Helpdesk.tsx`, but hard-locked logic fetching `getAllTickets()` filtering strictly toward tickets currently unassigned or assigned specifically to the Agent.

### `AgentHumanTicketDetails.tsx`
*   **Features**: Exposes direct metadata toggles bridging Agent permissions into `spService.updateTicket()` dynamically changing States (`In Progress`, `Awaiting Feedback`) forcing immediate re-renders. 
*   **Chat Core**: Operates the exact 5000ms polling cycle as the User's portal, preventing collision blocks. Houses a static placeholder `<div className={styles.aiPanel}>` meant to invoke Microsoft Copilot API abstractions.

---

## 👑 4. Administrator Portal (`adminHelpdesk/components`)

### `AdminDashboard.tsx`
*   **Purpose**: Root analytics tree.
*   **Data Funnel**: Downloads the entire global ticket ledger from SharePoint in bulk. React processes this array dynamically, segregating them into numerical buckets mapping out physical `<div className={styles.kpiCard}>` UI blocks dynamically.
*   **Filter Logic**: A `[myTicketsOnly, setMyTicketsOnly]` Boolean state switch invokes `Array.prototype.filter().length` instantly calculating local statistics against global metrics.

---

## 🎨 5. Scoped Styling (SCSS Modules)

The system isolates styling collisions directly by appending hashed classes during Webpack compilations.

*   `Dashboard.module.scss` (and its variants for Admin/Agent):
    *   **The Global Hack**: Imports `:global` to forcibly target `<div class="CanvasZone">` generated by SharePoint internally. It aggressively overrides `max-width: 100% !important;` making the SPFx App ignore classic column restrictions.
    *   **The Glassmorphism Engine**: Uses standard CSS variable dictionaries (`--brand-orange`, `--brand-dark-blue`) nested deep into root classes `( .adminDashboard { ... } )`. Combines `rgba` background streams intersecting with `backdrop-filter: blur(Xpx);` arrays to ensure light traces through containers organically.
    *   **Transitions**: Buttons (`.btnPrimary`) and Layout tables (`tbody tr:hover`) apply `.2s ease-in-out` `transform: scale(1.01)` computations forcing responsive physics when mice hover arrays.
