import * as React from 'react';
import { IAdminHelpdeskProps } from './IAdminHelpdeskProps';
import { AdminDashboard } from './AdminDashboard';
import { TicketManagement } from './TicketManagement';
import { UserManagement } from './UserManagement';
import { AgentDashboard } from './AgentDashboard';
import { SPService } from '../../../services/SPService';

export interface IAdminHelpdeskState {
  currentView: 'admin' | 'agent' | 'ticket-management' | 'user-management';
  userRole: 'Admin' | 'Agent' | 'User' | null;
  isLoading: boolean;
}

export default class AdminHelpdesk extends React.Component<IAdminHelpdeskProps, IAdminHelpdeskState> {
  private _spService: SPService;

  constructor(props: IAdminHelpdeskProps) {
    super(props);
    this._spService = new SPService(this.props.context);
    this.state = {
      currentView: 'admin',
      userRole: null,
      isLoading: true
    };
  }

  public async componentDidMount(): Promise<void> {
    try {
      const role = await this._spService.getCurrentUserRole();
      this.setState({ 
        userRole: role, 
        currentView: role === 'Agent' ? 'agent' : 'admin',
        isLoading: false 
      });
    } catch (error) {
      console.error("Error initializing admin helpdesk", error);
      this.setState({ isLoading: false });
    }
  }

  public render(): React.ReactElement<IAdminHelpdeskProps> {
    const {
      isDarkTheme,
      userDisplayName,
      context,
      userPageUrl,
      powerBIReportUrl
    } = this.props;

    if (this.state.isLoading) {
      return <div style={{ padding: '20px', textAlign: 'center' }}>Initialisation...</div>;
    }

    if (this.state.currentView === 'user-management') {
      return (
        <UserManagement
          isDarkTheme={isDarkTheme}
          context={context}
          onNavigateBack={() => this.setState({ currentView: this.state.userRole === 'Agent' ? 'agent' : 'admin' })}
        />
      );
    }

    if (this.state.currentView === 'ticket-management') {
      return (
        <TicketManagement
          isDarkTheme={isDarkTheme}
          context={context}
          spService={this._spService}
          onNavigateBack={() => this.setState({ currentView: this.state.userRole === 'Agent' ? 'agent' : 'admin' })}
        />
      );
    }

    if (this.state.currentView === 'agent') {
      return (
        <AgentDashboard
          userDisplayName={userDisplayName}
          isDarkTheme={isDarkTheme}
          context={context}
          spService={this._spService}
          onNavigateBack={() => {
            if (userPageUrl) window.location.href = userPageUrl;
          }}
          onNavigateToTickets={() => this.setState({ currentView: 'ticket-management' })}
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
          onNavigateToAgent={() => this.setState({ currentView: 'agent' })}
        />
      </div>
    );
  }
}
