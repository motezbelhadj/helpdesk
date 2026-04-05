import { WebPartContext } from "@microsoft/sp-webpart-base";

/**
 * Properties for the AdminHelpdesk web part.
 */
export interface IAdminHelpdeskProps {
  description: string;          // The description for the web part
  isDarkTheme: boolean;         // Whether dark theme is enabled
  environmentMessage: string;   // Information about the current SPFx environment
  hasTeamsContext: boolean;     // Whether the web part is running in Microsoft Teams
  userDisplayName: string;       // Display name of the current user
  userEmail: string;            // Email of the current user
  context: WebPartContext;      // SharePoint Context
  userPageUrl?: string;         // Optional URL for the user portal
  powerBIReportUrl?: string;    // Optional Power BI report URL
}
