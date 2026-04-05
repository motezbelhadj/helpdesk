import * as React from 'react';
import { IAdminHelpdeskProps } from './IAdminHelpdeskProps';
import { AdminDashboard } from './AdminDashboard';
import { TicketManagement } from './TicketManagement';
import { UserManagement } from './UserManagement';
import { SPService } from '../../../services/SPService';

/**
 * State for the AdminHelpdesk component.
 */
export interface IAdminHelpdeskState {
  currentView: 'admin' | 'ticket-management' | 'user-management'; // Tracks the current active view
  userRole: 'Admin' | 'Agent' | 'User' | null;                   // Stores the role of the current user
  isLoading: boolean;                                            // Indicates if the initial data is loading
}

/**
 * Main AdminHelpdesk web part component.
 * Manages navigation between the Admin Dashboard, Ticket Management, and User Management views.
 */
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
        currentView: role === 'Agent' ? 'ticket-management' : 'admin',
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
      return <div style={{ padding: '20px', textAlign: 'center' }}>Initializing...</div>;
    }

    if (this.state.currentView === 'user-management') {
      return (
        <UserManagement
          isDarkTheme={isDarkTheme}
          context={context}
          spService={this._spService}
          onNavigateBack={() => {
            if (this.state.userRole === 'Agent') {
              if (userPageUrl) window.location.href = userPageUrl;
            } else {
              this.setState({ currentView: 'admin' });
            }
          }}
        />
      );
    }

    if (this.state.currentView === 'ticket-management') {
      return (
        <TicketManagement
          isDarkTheme={isDarkTheme}
          context={context}
          spService={this._spService}
          onNavigateBack={() => {
            if (this.state.userRole === 'Agent') {
              if (userPageUrl) window.location.href = userPageUrl;
            } else {
              this.setState({ currentView: 'admin' });
            }
          }}
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
