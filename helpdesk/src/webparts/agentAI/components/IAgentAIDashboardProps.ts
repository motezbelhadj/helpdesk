import { WebPartContext } from "@microsoft/sp-webpart-base";

export interface IAgentAIDashboardProps {
  description: string;
  isDarkTheme: boolean;
  environmentMessage: string;
  hasTeamsContext: boolean;
  userDisplayName: string;
  context: WebPartContext;
  dashboardPageUrl?: string;
}
