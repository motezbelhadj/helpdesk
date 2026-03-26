declare interface IAgentHumanWebPartStrings {
  PropertyPaneDescription: string;
  BasicGroupName: string;
  DescriptionFieldLabel: string;
  AppLocalEnvironmentSharePoint: string;
  AppLocalEnvironmentTeams: string;
  AppSharePointEnvironment: string;
  AppTeamsTabEnvironment: string;
}

declare module 'AgentHumanWebPartStrings' {
  const strings: IAgentHumanWebPartStrings;
  export = strings;
}
