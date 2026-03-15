import { WebPartContext } from "@microsoft/sp-webpart-base";

export interface IHelpdeskProps {
  description: string;
  isDarkTheme: boolean;
  environmentMessage: string;
  hasTeamsContext: boolean;
  userDisplayName: string;
  userEmail: string;
  context: WebPartContext;
}
