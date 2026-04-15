# 🌟 Intelligent Helpdesk System - Technical Documentation

A modern, responsive, and AI-assisted Helpdesk solution built using the **SharePoint Framework (SPFx)**, **React**, and **PnPjs**. This documentation covers the deep technical architecture, data schemas, state management, and deployment strategies of the project.

---

## 🏗️ System Architecture & SPFx Web Parts

The solution is divided into three modular SPFx Web Parts, each tailored to specific user roles to ensure security and clean separation of concerns.

### 1. `HelpdeskWebPart` (User Portal)
*   **Entry Component**: `Helpdesk.tsx`
*   **Routing**: Implements conditional rendering using a boolean state (`showForm`) to toggle between the `HelpdeskDashboard` and the `TicketForm`.
*   **AI Chatbot Engine**: `ChatbotInterface.tsx` uses a mock heuristic NLP algorithm. It matches user string inputs against keyword arrays (e.g., `.indexOf('password') !== -1`) to dynamically deduce `Priority` and `Category`. It leverages asynchronous `setTimeout` promises to simulate AI processing latency and typing indicators before emitting the `ITicketDefaults` payload back up to the parent `HelpdeskDashboard`.
*   **Live Chat Sync Effect**: `UserTicketDetails.tsx` utilizes a generic `useEffect` loop that triggers `setInterval` every 5000ms. It isolates the `spService.getComments(ticket.Id)` API call to prevent full component re-renders, comparing the current user's SharePoint token (`currentUserTitle`) against the `Author.Title` to apply the `.currentUserComment` CSS class dynamically.

### 2. `AgentHumanWebPart` (Agent Portal)
*   **Entry Component**: `AgentHuman.tsx`
*   **State Management**: Complex dashboard state mapping active tickets. It manages the `isUpdating` blocking state when an agent transitions a ticket's status.
*   **AI Copilot Panel**: A static React sub-component that suggests technical actions to the agent based on the ticket's contextual data.

### 3. `AdminHelpdeskWebPart` (Admin Analytics Portal)
*   **Entry Component**: `AdminDashboard.tsx`
*   **Data Aggregation**: Aggregates all global tickets via `spService.getAllTickets()`.
*   **Filtering Logic**: Implements a highly performant `myTicketsOnly` filter using `Array.prototype.filter`, matching the ticket's `AssignedTo/Id` or `Author/Title` against the SPFx `this.context.pageContext.user.displayName`.
*   **PowerBI & Charts Integration**: Designed to securely host `<iframe>` elements referencing Power BI Report URLs for advanced analytics.

---

## 💻 Technical Stack & Dependencies

*   **Core Framework**: Microsoft SharePoint Framework (SPFx) `v1.18+` targeting SharePoint Online.
*   **Library**: React `v17` (using functional components and Hooks uniquely: `useState`, `useEffect`, `useRef`).
*   **PnPjs (`@pnp/sp`)**: The project uses the modern `spfi()` factory pattern from PnPjs v3. 
    *   *Selective Imports*: We import specific modules (`@pnp/sp/webs`, `@pnp/sp/lists`, `@pnp/sp/items`) to reduce the webpack bundle payload size rather than importing the entire preset.
*   **UI Components**: Microsoft Fluent UI (`@fluentui/react` `v8.x`) is heavily utilized for inputs, dropdowns, buttons, and system Icons.
*   **Build Toolchain**: Node `v18.x`, Gulp, TypeScript `v4.7+`, Webpack.

---

## 🗄️ SharePoint Data Schema & Models

The application persists data entirely without a backend database via SharePoint Online Custom Lists. The PnPjs `SPService` maps these lists into deeply typed React interfaces.

### 1. The `ticket` List
*   **Title** (Single line of text) - The brief issue summary.
*   **Reference** (Single line of text) - Auto-generated UUID format (e.g., `TKT-2026-1023`).
*   **Description** (Multiple lines of text) - The core issue details.
*   **Categorie** (Choice) - Hardware, Software, IT Support, HR, Functional, Logistics, Other.
*   **Priorite** (Choice) - Low, Normal, High, Urgent.
*   **Status** (Choice) - Pending, In Progress, Awaiting Feedback, Resolved.
*   **Creepar** (Person or Group) - Associates the creator.
*   **AssignedTo** (Person or Group) - For agent routing.
*   *Attachments* are supported natively via SPFx File blobs (`.add(attachment.name, attachment)`).

### 2. The `ticket_comments` List
*   **TicketId** (Number) - Foreign key referencing the `ticket.Id`.
*   **Commentaire / Text** (Multiple lines of text) - The body of the chat message.
*   **Author** (System Field) - Automatically fetched via PnP expand queries (`expand("Author")`) to resolve the sender's display name.

---

## 🚦 Application Logic & Custom Hooks

### API REST Service Layer (`SPService.ts`)

> [!IMPORTANT]
> The `SPService` class is the central nervous system for all database and REST API operations. It provides clean, asynchronous promises to React components, hiding complex SharePoint OData REST queries.

**Why Abstract the API?**
By routing all network communication through `SPService`, the application maintains a clean separation of concerns. The React UI never writes raw HTTP fetch commands or OData strings directly.

#### Example API Wrapper
Below is the abstraction for fetching chat messages over the REST API. Notice how it efficiently handles query configuration to prevent performance bottlenecks:

```typescript
public async getComments(ticketId: number): Promise<any[]> {
    return await this._sp.web.lists.getByTitle("ticket_comments").items
        // Select only the necessary columns to reduce the JSON payload size
        .select("Id", "TicketId", "Commentaire", "Text", "Author/Id", "Author/Title", "Created")
        // Expand the Author lookup fields in a single relational join
        .expand("Author")
        // Filter strictly to the current ticket
        .filter(`TicketId eq '${ticketId}' or TicketId eq ${ticketId}`)
        .orderBy("Created", true)();
}
```

> [!TIP]
> **Query Pipeline Strategy:** Explicitly using `.select()` eliminates data over-fetching, while `.expand()` handles SQL-like JOIN operations across lists, keeping network round-trips to a minimum.

### Auto-Sync & Polling Architecture
The Helpdesk Chat implements an optimistic UI pattern alongside soft-polling:
1. When a user sends a message, it immediately hits the `addComment` PnP execution.
2. The UI enters an `isUpdating` locked state.
3. Upon Promise resolution, it forces an immediate `loadData()` refresh.
4. Concurrently, a `setInterval` runs every `5000ms`, executing a lightweight background fetch to pull new comments from the opposite party (Agent vs User) mapping the results to the React Native Virtual DOM for seamless hydration.

---

## 🎨 Advanced CSS & Theming Engine

The project abandons classic `.ms-` Fabric UI overrides for a bespoke **Glassmorphism** styling engine written in strictly scoped SCSS Modules (`.module.scss`).

*   **Global Overrides**: To bypass SharePoint's standard `1200px` canvas `max-width`, we inject `:global` namespace hacks against `#workbenchPageContent` and `.CanvasZone`, forcing `max-width: 100% !important`. This forces edge-to-edge responsiveness.
*   **CSS Variables (Custom Properties)**: Variables like `--brand-orange: #F58220;` and `--glass-bg: rgba(255, 255, 255, 0.9);` are mapped at the root block (e.g., `.helpdeskDashboard`). This allows the instant transition to Dark Mode simply by appending `.dark` to the parent div, which swaps the CSS variable mapping in real-time without JavaScript reflows.
*   **Dynamic Chat Highlighting**: The application evaluates `c.Author?.Title === currentUserTitle` on the fly to intelligently append the `.currentUserComment` class to DOM nodes, flipping the border-left layout algorithm.
