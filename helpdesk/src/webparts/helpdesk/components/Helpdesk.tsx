import * as React from 'react';
import type { IHelpdeskProps } from './IHelpdeskProps';
import { HelpdeskDashboard } from './HelpdeskDashboard';
import { TicketForm } from './TicketForm';
import { SPService } from '../../../services/SPService';

interface IHelpdeskState {
  showForm: boolean;
}

export default class Helpdesk extends React.Component<IHelpdeskProps, IHelpdeskState> {
  private _spService: SPService;

  constructor(props: IHelpdeskProps) {
    super(props);
    this.state = {
      showForm: false
    };
    this._spService = new SPService(this.props.context);
  }

  public render(): React.ReactElement<IHelpdeskProps> {
    const {
      isDarkTheme,
      userDisplayName,
      userEmail,
      adminPageUrl
    } = this.props;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        {this.state.showForm ? (
          <TicketForm 
            spService={this._spService}
            currentUserDisplayName={userDisplayName}
            onClose={() => this.setState({ showForm: false })}
          />
        ) : (
          <HelpdeskDashboard
            userDisplayName={userDisplayName}
            userEmail={userEmail}
            isDarkTheme={isDarkTheme}
            context={this.props.context}
            spService={this._spService}
            onNewTicket={() => this.setState({ showForm: true })}
            onNavigateToAdmin={() => { 
              if (adminPageUrl) {
                window.location.href = adminPageUrl;
              } else {
                alert('Please configure the Admin Page URL in the web part properties first.'); 
              }
            }}
          />
        )}
      </div>
    );
  }
}
