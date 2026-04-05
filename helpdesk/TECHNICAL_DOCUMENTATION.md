# Helpdesk System - Technical Documentation

## 1. Project Overview
The Helpdesk system is an enterprise-grade support ticket management solution built as a SharePoint Framework (SPFx) web part. It provides a centralized platform for managing IT and administrative requests within an organization.

**Main Features:**
- **User Portal:** Allows employees to create new tickets, track existing requests, and communicate with support agents through a real-time conversation feed.
- **Agent Command Center:** A dedicated interface for support agents to view assigned tickets, filter by urgency, manage their queue, and resolve issues efficiently.
- **Admin Dashboard:** Enables administrators to monitor system health, manage support personnel (Agents), and configure application settings.
- **Real-Time Synchronization:** Leverages SharePoint Lists as the backend database with instant UI updates and periodic syncing for collaborative ticket resolution.

## 2. Prerequisites
Before installing and running the project, ensure your development environment meets the following requirements:

- **Node.js:** Version 16.x or 18.x (LTS recommended for SPFx)
- **npm:** Version 8.x or higher
- **Gulp CLI:** Installed globally (`npm install gulp-cli -g`)
- **Yeoman & SharePoint Generator:** Installed globally (`npm install -g yo @microsoft/generator-sharepoint`)
- **SharePoint Environment:** An Office 365 tenant / SharePoint Online site with sufficient permissions to create lists and deploy web parts.

## 3. Creating a New SPFx Project
If you are starting from scratch instead of cloning the existing repository, follow these steps to scaffold a new SharePoint Framework project:

1. **Create a new project directory:**
   ```bash
   md helpdesk
   cd helpdesk
   ```

2. **Run the SharePoint Generator:**
   ```bash
   yo @microsoft/sharepoint
   ```

3. **Answer the generator prompts:**
   - **What is your solution name?** `helpdesk`
   - **Which type of client-side component to create?** `WebPart`
   - **What is your Web part name?** `HelpdeskDashboard`
   - **Which template would you like to use?** `React`

4. Once the scaffolding is complete, you can begin adding your custom React components and modifying the `src/webparts` directory.

## 4. Installation (Existing Project)
Follow these steps to set up the cloned project locally:

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd helpdesk
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Trust the developer certificate (first-time setup only):**
   ```bash
   gulp trust-dev-cert
   ```

## 5. Configuration
The application relies on SharePoint Lists to store data. You must create the following lists in your SharePoint site before running the application:

### List 1: `ticket`
Stores the main helpdesk requests.
- **Title** (Single line of text) - Default column
- **Reference** (Single line of text) - Auto-generated metric (e.g., TK-10)
- **Status** (Choice) - Options: `Pending`, `In Progress`, `Awaiting Feedback`, `Resolved`
- **Priority** / **Priorite** (Choice) - Options: `Normal`, `High`, `Urgent`
- **Category** / **Categorie** (Choice) - e.g., `IT Support`, `HR Request`
- **Description** (Multiple lines of text)
- **AssignedTo** (Person or Group)
- **Creepar** (Person or Group)

### List 2: `ticket_comments`
Stores the conversation history for each ticket.
- **Title** (Single line of text) - Default column (can be hidden)
- **TicketId** (Number) - ID of the parent ticket
- **Commentaire** / **Text** (Multiple lines of text) - The message content

### List 3: `user`
Manages the roles and permissions for the Helpdesk app.
- **Title** (Single line of text) - Default column
- **user** (Person or Group) - The Office 365 user
- **role** / **Role** (Choice) - Options: `Admin`, `Agent`, `User`

### Site URL Configuration
Update the `config/serve.json` file to point to your target SharePoint development site:
```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/core-build/serve.schema.json",
  "port": 4321,
  "https": true,
  "initialPage": "https://<your-tenant>.sharepoint.com/sites/<your-site>/_layouts/15/workbench.aspx"
}
```

## 6. Running the Project
To run the SPFx project locally and test it against your live SharePoint environment:

1. Launch the local development server:
   ```bash
   gulp serve
   ```
2. The browser will automatically open the SharePoint Workbench.
3. Click the `+` icon on the canvas and add the **Helpdesk** or **AdminHelpdesk** web part to view the application in action.

## 7. Build & Deployment
When the project is ready for production, follow these steps to package and deploy the solution.

1. **Bundle the solution:**
   Run the following command to bundle your web part for production viewing:
   ```bash
   gulp bundle --ship
   ```

2. **Package the solution:**
   Package the bundled files into an `.sppkg` file:
   ```bash
   gulp package-solution --ship
   ```

3. **Deploy to SharePoint:**
   - Navigate to your SharePoint Tenant **App Catalog**.
   - Upload the generated `.sppkg` file (found in the `sharepoint/solution/` folder) to the App Catalog.
   - Check the box to make the solution available to all sites in the organization.
   - Add the App to your target SharePoint site and place the web part on a modern page.

## 8. Testing the Application
To ensure everything is functioning correctly:

1. **Create a Ticket:** Log in as a standard user, navigate to the User Portal, and submit a new ticket. Verify that it appears in the Active Requests list.
2. **Assign and Process:** Log in as an Agent, open the Agent Panel, and verify the new ticket appears in the pending queue. Change the status to "In Progress".
3. **Communication:** Add a comment from the Agent view. Switch back to the User view and verify that the message appears in the conversation feed.
4. **Resolution:** Mark the ticket as "Resolved" and confirm it moves to the Resolved History section on the user dashboard.

## 9. Troubleshooting

**Error: "Failed to post comment. Please verify if the 'ticket_comments' list exists."**
- **Solution:** Ensure the `ticket_comments` list is created in your SharePoint site and the internal names of the columns exactly match `TicketId`, `Commentaire`, and `Text`.

**Error: Red badge on Agent Panel stays at zero despite pending tickets.**
- **Solution:** Verify the `user` list role mapping. The agent's account must explicitly be marked with the `Agent` role in the list, and the ticket's `AssignedTo` field must contain the exact User ID of the logged-in agent.

**Error: Browser shows a privacy error when running `gulp serve`.**
- **Solution:** The local SPFx development certificate has not been completely trusted by your system. Run `gulp trust-dev-cert` in an administrator terminal and restart your browser.
