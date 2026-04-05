import * as React from 'react';
import type { IHelpdeskProps } from './IHelpdeskProps';
import { HelpdeskDashboard } from './HelpdeskDashboard';
import { TicketForm } from './TicketForm';
import { UserProfile } from './UserProfile';
import { SPService } from '../../../services/SPService';

/**
 * State for the Helpdesk component.
 */
interface IHelpdeskState {
  showForm: boolean; // Controls whether to show the new ticket form or the dashboard
  showProfile: boolean; // Controls whether to show the user profile page
}

/**
 * Main Helpdesk web part component.
 * Manages the display of either the dashboard or the new ticket form.
 */
export default class Helpdesk extends React.Component<IHelpdeskProps, IHelpdeskState> {
  private _spService: SPService;

  constructor(props: IHelpdeskProps) {
    super(props);
    this.state = {
      showForm: false,
      showProfile: false
    };
    this._spService = new SPService(this.props.context);
  }

  public render(): React.ReactElement<IHelpdeskProps> {
    const {
      isDarkTheme,
      userDisplayName,
      userEmail,
      adminPageUrl,
      agentPageUrl,
      agentAIPageUrl
    } = this.props;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        {this.state.showForm ? (
          <TicketForm 
            spService={this._spService}
            currentUserDisplayName={userDisplayName}
            onClose={() => this.setState({ showForm: false })}
          />
        ) : this.state.showProfile ? (
          <UserProfile
            userDisplayName={userDisplayName}
            userEmail={userEmail}
            isDarkTheme={isDarkTheme}
            spService={this._spService}
            onBack={() => this.setState({ showProfile: false })}
          />
        ) : (
          <HelpdeskDashboard
            userDisplayName={userDisplayName}
            userEmail={userEmail}
            isDarkTheme={isDarkTheme}
            context={this.props.context}
            spService={this._spService}
            onNewTicket={() => this.setState({ showForm: true })}
            onNavigateToProfile={() => this.setState({ showProfile: true })}
            onNavigateToAdmin={() => { 
              if (adminPageUrl) {
                window.location.href = adminPageUrl;
              } else {
                alert('Please configure the Admin Page URL in the web part properties first.'); 
              }
            }}
            onNavigateToAgent={() => {
              if (agentPageUrl) {
                window.location.href = agentPageUrl;
              } else {
                alert('Please configure the Agent Page URL in the web part properties first.');
              }
            }}
            onNavigateToAgentAI={(searchText?: string) => {
              if (agentAIPageUrl) {
                const url = new URL(agentAIPageUrl, window.location.origin);
                if (searchText) {
                  url.searchParams.set('q', searchText);
                }
                window.location.href = url.toString();
              } else {
                alert('Please configure the Agent AI Page URL in the web part properties first.');
              }
            }}
          />
        )}
      </div>
    );
  }
}
