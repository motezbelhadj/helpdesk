import { override } from '@microsoft/decorators';
import { BaseApplicationCustomizer } from '@microsoft/sp-application-base';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { spfi, SPFI, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/site-users/web';
import { NotificationHeaderComponent } from './components/NotificationHeaderComponent';

/**
 * If your command set uses the ClientSideComponentProperties JSON input,
 * it will be deserialized into the BaseExtension.properties object.
 * You can define an interface to describe it.
 */
export interface INotificationHeaderApplicationCustomizerProperties {
  testMessage: string;
}

/** A Custom Action which can be run during execution of a Client Side Application */
export default class NotificationHeaderApplicationCustomizer
  extends BaseApplicationCustomizer<INotificationHeaderApplicationCustomizerProperties> {

  private _sp: SPFI;
  private _intervalId: any = null;

  @override
  public onInit(): Promise<void> {
    console.log('NotificationHeaderApplicationCustomizer: Initializing...');
    try {
      this._sp = spfi().using(SPFx(this.context));

      // Attempt injection immediately
      this._injectIntoSuiteBar();

      // Set up a loop to keep the bell icon in place if the suite bar gets redrawn/updated by SPFx routing
      this._intervalId = setInterval(() => {
        this._injectIntoSuiteBar();
      }, 1500);

    } catch (error) {
      console.error('NotificationHeaderApplicationCustomizer: Error in onInit', error);
    }

    return Promise.resolve();
  }

  private _injectIntoSuiteBar(): void {
    try {
      // Find the settings button (most standard target) or help button, or the right aligned navbar
      const targetElement = document.getElementById('O365_MainLink_Settings') || 
                            document.getElementById('O365_MainLink_Help') ||
                            document.querySelector('.o365cs-nav-rightAlign') ||
                            document.querySelector('[class*="rightAlign"]');

      if (!targetElement) {
        // Quietly fail and retry on the next interval tick (useful if Page is still loading)
        return;
      }

      let container = document.getElementById('custom-notification-bell-container');
      
      // If container already exists, ensure it is still in the correct location (parented correctly)
      if (container) {
        if (targetElement.id === 'O365_MainLink_Settings' || targetElement.id === 'O365_MainLink_Help') {
          if (container.nextSibling !== targetElement && targetElement.parentNode) {
            targetElement.parentNode.insertBefore(container, targetElement);
          }
        } else if (container.parentNode !== targetElement) {
          targetElement.appendChild(container);
        }
        return;
      }

      // Create new container
      container = document.createElement('div');
      container.id = 'custom-notification-bell-container';

      // Style container to fit nicely in Suite Bar
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.height = '48px';
      container.style.width = '48px';
      container.style.float = 'left'; // Align correctly depending on flex/float context
      container.style.order = '-1'; // Ensure it appears before the target element in flex containers

      if ((targetElement.id === 'O365_MainLink_Settings' || targetElement.id === 'O365_MainLink_Help') && targetElement.parentNode) {
        targetElement.parentNode.insertBefore(container, targetElement);
      } else {
        targetElement.appendChild(container);
      }

      console.log('NotificationHeaderApplicationCustomizer: Injected container into Suite Bar.');

      // Render the component
      const element = React.createElement(NotificationHeaderComponent, {
        sp: this._sp,
        isSuiteBar: true
      });
      ReactDOM.render(element, container);
      console.log('NotificationHeaderApplicationCustomizer: Rendered React component inside Suite Bar.');
    } catch (err) {
      console.error('NotificationHeaderApplicationCustomizer: Error in _injectIntoSuiteBar', err);
    }
  }

  @override
  public onDispose(): void {
    if (this._intervalId) {
      clearInterval(this._intervalId);
    }
    const container = document.getElementById('custom-notification-bell-container');
    if (container) {
      ReactDOM.unmountComponentAtNode(container);
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
    console.log('NotificationHeaderApplicationCustomizer: Disposed.');
  }
}
