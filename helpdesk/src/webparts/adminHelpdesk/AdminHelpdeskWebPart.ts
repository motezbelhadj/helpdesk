import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { IReadonlyTheme } from '@microsoft/sp-component-base';

import * as strings from 'AdminHelpdeskWebPartStrings';
import AdminHelpdesk from './components/AdminHelpdesk';
import { IAdminHelpdeskProps } from './components/IAdminHelpdeskProps';

export interface IAdminHelpdeskWebPartProps {
  description: string;
  userPageUrl: string;
  powerBIReportUrl: string;
}

export default class AdminHelpdeskWebPart extends BaseClientSideWebPart<IAdminHelpdeskWebPartProps> {

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

    const element: React.ReactElement<IAdminHelpdeskProps> = React.createElement(
      AdminHelpdesk,
      {
        description: this.properties.description,
        isDarkTheme: this._isDarkTheme,
        environmentMessage: this._environmentMessage,
        hasTeamsContext: !!this.context.sdks.microsoftTeams,
        userDisplayName: this.context.pageContext.user.displayName,
        userEmail: this.context.pageContext.user.loginName,
        context: this.context,
        userPageUrl: this.properties.userPageUrl,
        powerBIReportUrl: this.properties.powerBIReportUrl
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
    if (!!this.context.sdks.microsoftTeams) { // running in Teams, office.com or Outlook
      return this.context.sdks.microsoftTeams.teamsJs.app.getContext()
        .then(context => {
          let environmentMessage: string = '';
          switch (context.app.host.name) {
            case 'Office': // running in Office
              environmentMessage = this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentOffice : strings.AppOfficeEnvironment;
              break;
            case 'Outlook': // running in Outlook
              environmentMessage = this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentOutlook : strings.AppOutlookEnvironment;
              break;
            case 'Teams': // running in Teams
            case 'TeamsModern':
              environmentMessage = this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentTeams : strings.AppTeamsTabEnvironment;
              break;
            default:
              environmentMessage = strings.UnknownEnvironment;
          }

          return environmentMessage;
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
                  label: 'User Portal URL',
                  description: 'The URL of the SharePoint page where the regular User Helpdesk web part is hosted.'
                }),
                PropertyPaneTextField('powerBIReportUrl', {
                  label: 'Power BI Report URL',
                  description: 'Paste the "Publish to Web" or "Embed in SharePoint" link from your Power BI report.'
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
