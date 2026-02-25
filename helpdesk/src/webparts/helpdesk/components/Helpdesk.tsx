import * as React from 'react';
import type { IHelpdeskProps } from './IHelpdeskProps';
import { HelpdeskDashboard } from './HelpdeskDashboard';

export default class Helpdesk extends React.Component<IHelpdeskProps, {}> {
  public render(): React.ReactElement<IHelpdeskProps> {
    const {
      isDarkTheme,
      userDisplayName
    } = this.props;

    return (
      <HelpdeskDashboard
        userDisplayName={userDisplayName}
        isDarkTheme={isDarkTheme}
        context={this.props.context}
      />
    );
  }
}

