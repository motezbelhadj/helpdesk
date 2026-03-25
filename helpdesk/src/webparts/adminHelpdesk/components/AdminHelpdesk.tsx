import * as React from 'react';
import { IAdminHelpdeskProps } from './IAdminHelpdeskProps';
import { AdminDashboard } from './AdminDashboard';
import { TicketManagement } from './TicketManagement';
import { UserManagement } from './UserManagement';

export interface IAdminHelpdeskState {
  currentView: 'admin' | 'ticket-management' | 'user-management';
}

export default class AdminHelpdesk extends React.Component<IAdminHelpdeskProps, IAdminHelpdeskState> {
  constructor(props: IAdminHelpdeskProps) {
    super(props);
    this.state = {
      currentView: 'admin'
    };
  }

  public render(): React.ReactElement<IAdminHelpdeskProps> {
    const {
      isDarkTheme,
      userDisplayName,
      context,
      userPageUrl,
      powerBIReportUrl
    } = this.props;

    if (this.state.currentView === 'user-management') {
      return (
        <UserManagement
          isDarkTheme={isDarkTheme}
          context={context}
          onNavigateBack={() => this.setState({ currentView: 'admin' })}
        />
      );
    }

    if (this.state.currentView === 'ticket-management') {
      return (
        <TicketManagement
          isDarkTheme={isDarkTheme}
          context={context}
          onNavigateBack={() => this.setState({ currentView: 'admin' })}
        />
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        <AdminDashboard
          userDisplayName={userDisplayName}
          isDarkTheme={isDarkTheme}
          context={context}
          powerBIReportUrl={powerBIReportUrl}
          onNavigateBack={() => {
            if (userPageUrl) {
              window.location.href = userPageUrl;
            } else {
              alert('Please configure the User Portal URL in the web part properties first.');
            }
          }}
          onNavigateToTickets={() => this.setState({ currentView: 'ticket-management' })}
          onNavigateToUsers={() => this.setState({ currentView: 'user-management' })}
        />
      </div>
    );
  }
}
