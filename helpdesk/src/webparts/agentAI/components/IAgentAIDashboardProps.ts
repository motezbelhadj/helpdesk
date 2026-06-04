import { WebPartContext } from "@microsoft/sp-webpart-base";
import { SPService } from "../../../services/SPService";

export interface IAgentAIDashboardProps {
  description: string;
  isDarkTheme: boolean;
  environmentMessage: string;
  hasTeamsContext: boolean;
  userDisplayName: string;
  context: WebPartContext;
  spService: SPService;
  dashboardPageUrl?: string;
  agentPageUrl?: string;
  adminPageUrl?: string;
}
