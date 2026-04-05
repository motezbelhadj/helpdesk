import { WebPartContext } from "@microsoft/sp-webpart-base";

/**
 * Properties for the AgentHuman web part.
 */
export interface IAgentHumanProps {
  description: string;          // The description of the web part
  isDarkTheme: boolean;         // Whether the dark theme is enabled
  environmentMessage: string;   // Message about the current environment
  hasTeamsContext: boolean;     // Whether the web part is running in Teams
  userDisplayName: string;       // The name of the current user
  context: WebPartContext;      // SharePoint context
  userPageUrl?: string;         // Optional URL for the user portal
  agentAIPageUrl?: string;      // Optional URL for the AI assistant
}
