import * as React from 'react';
import type { IHelpdeskProps } from './IHelpdeskProps';
import { HelpdeskDashboard } from './HelpdeskDashboard';
import { AdminDashboard } from './AdminDashboard';
import { TicketManagement } from './TicketManagement';
import { UserManagement } from './UserManagement';

export interface IHelpdeskState {
  currentView: 'user' | 'admin' | 'ticket-management' | 'user-management';
}

export default class Helpdesk extends React.Component<IHelpdeskProps, IHelpdeskState> {
  constructor(props: IHelpdeskProps) {
    super(props);
    this.state = {
      currentView: 'user'
    };
  }

  public render(): React.ReactElement<IHelpdeskProps> {
    const {
      isDarkTheme,
      userDisplayName,
      userEmail
    } = this.props;

    if (this.state.currentView === 'admin') {
      return (
        <AdminDashboard
          userDisplayName={userDisplayName}
          isDarkTheme={isDarkTheme}
          context={this.props.context}
          onNavigateBack={() => this.setState({ currentView: 'user' })}
          onNavigateToTickets={() => this.setState({ currentView: 'ticket-management' })}
          onNavigateToUsers={() => this.setState({ currentView: 'user-management' })}
        />
      );
    }

    if (this.state.currentView === 'user-management') {
      return (
        <UserManagement
          isDarkTheme={isDarkTheme}
          context={this.props.context}
          onNavigateBack={() => this.setState({ currentView: 'admin' })}
        />
      );
    }

    if (this.state.currentView === 'ticket-management') {
      return (
        <TicketManagement
          isDarkTheme={isDarkTheme}
          context={this.props.context}
          onNavigateBack={() => this.setState({ currentView: 'admin' })}
        />
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
         <HelpdeskDashboard
          userDisplayName={userDisplayName}
          userEmail={userEmail}
          isDarkTheme={isDarkTheme}
          context={this.props.context}
          onNavigateToAdmin={() => this.setState({ currentView: 'admin' })}
        />
      </div>
    );
  }
}
