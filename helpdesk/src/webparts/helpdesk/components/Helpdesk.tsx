import * as React from 'react';
import type { IHelpdeskProps } from './IHelpdeskProps';
import { HelpdeskDashboard } from './HelpdeskDashboard';
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

  public componentDidMount(): void {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new') {
      this.setState({ showForm: true });
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
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
        <HelpdeskDashboard
          userDisplayName={userDisplayName}
          userEmail={userEmail}
          isDarkTheme={isDarkTheme}
          context={this.props.context}
          spService={this._spService}
          initialView={this.state.showForm ? 'new-ticket' : this.state.showProfile ? 'profile' : 'dashboard'}
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
      </div>
    );
  }
}
