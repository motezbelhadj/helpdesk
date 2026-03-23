import * as React from 'react';
import type { IHelpdeskProps } from './IHelpdeskProps';
import { HelpdeskDashboard } from './HelpdeskDashboard';

export default class Helpdesk extends React.Component<IHelpdeskProps, {}> {

  public render(): React.ReactElement<IHelpdeskProps> {
    const {
      isDarkTheme,
      userDisplayName,
      userEmail,
      adminPageUrl
    } = this.props;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
         <HelpdeskDashboard
          userDisplayName={userDisplayName}
          userEmail={userEmail}
          isDarkTheme={isDarkTheme}
          context={this.props.context}
          onNavigateToAdmin={() => { 
            if (adminPageUrl) {
              window.location.href = adminPageUrl;
            } else {
              alert('Please configure the Admin Page URL in the web part properties first.'); 
            }
          }}
        />
      </div>
    );
  }
}
