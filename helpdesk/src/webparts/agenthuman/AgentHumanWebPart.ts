import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  IPropertyPaneConfiguration,
  PropertyPaneTextField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { IReadonlyTheme } from '@microsoft/sp-component-base';

import * as strings from 'AgentHumanWebPartStrings';
import AgentHuman from './components/AgentHuman';
import { IAgentHumanProps } from './components/IAgentHumanProps';

export interface IAgentHumanWebPartProps {
  description: string;
  userPageUrl: string;
  agentAIPageUrl: string;
}

export default class AgentHumanWebPart extends BaseClientSideWebPart<IAgentHumanWebPartProps> {

  private _isDarkTheme: boolean = false;
  private _environmentMessage: string = '';

  public render(): void {
    // Inject global styles to force full width in SharePoint
    const style = document.createElement('style');
    style.innerHTML = `
      .ControlZone, .CanvasZone, .CanvasZone-section { max-width: none !important; margin: 0 !important; padding: 0 !important; }
      .ControlZone > div:first-child { max-width: none !important; }
      [data-automation-id="CanvasZone"] { max-width: none !important; }
    `;
    document.head.appendChild(style);

    const element: React.ReactElement<IAgentHumanProps> = React.createElement(
      AgentHuman,
      {
        description: this.properties.description,
        isDarkTheme: this._isDarkTheme,
        environmentMessage: this._environmentMessage,
        hasTeamsContext: !!this.context.sdks.microsoftTeams,
        userDisplayName: this.context.pageContext.user.displayName,
        context: this.context,
        userPageUrl: this.properties.userPageUrl,
        agentAIPageUrl: this.properties.agentAIPageUrl
      }
    );

    ReactDom.render(element, this.domElement);
  }

  protected onInit(): Promise<void> {
    return this._getEnvironmentMessage().then(message => {
      this._environmentMessage = message;
    });
  }



  private _getEnvironmentMessage(): Promise<string> {
    if (!!this.context.sdks.microsoftTeams) { // running in Teams, office.com or outlook.com
      return this.context.sdks.microsoftTeams.teamsJs.app.getContext()
        .then(context => {
          let posixDeviceMode = '';
          switch (context.app.host.name) {
            case 'Office': // running in Office
              posixDeviceMode = strings.AppLocalEnvironmentSharePoint;
              break;
            case 'Outlook': // running in Outlook
              posixDeviceMode = strings.AppLocalEnvironmentSharePoint;
              break;
            case 'Teams': // running in Teams
            case 'TeamsModern':
              posixDeviceMode = strings.AppLocalEnvironmentTeams;
              break;
            default:
              throw new Error('Unknown host');
          }

          return posixDeviceMode;
        });
    }

    return Promise.resolve(this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentSharePoint : strings.AppSharePointEnvironment);
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) {
      return;
    }

    this._isDarkTheme = !!currentTheme.isInverted;
    const {
      semanticColors
    } = currentTheme;

    if (semanticColors) {
      this.domElement.style.setProperty('--bodyText', semanticColors.bodyText || null);
      this.domElement.style.setProperty('--link', semanticColors.link || null);
      this.domElement.style.setProperty('--linkHovered', semanticColors.linkHovered || null);
    }

  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField('description', {
                  label: strings.DescriptionFieldLabel
                }),
                PropertyPaneTextField('userPageUrl', {
                  label: 'User Portal URL'
                }),
                PropertyPaneTextField('agentAIPageUrl', {
                  label: 'Agent AI Page URL'
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
