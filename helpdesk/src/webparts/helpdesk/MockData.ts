export interface ITicket {
  id: string;
  title: string;
  status: 'Pending' | 'In Progress' | 'Awaiting Feedback' | 'Resolved' | 'Resolu' | 'En cours' | 'En attente';
  date: string;
  category: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  assignedTo?: string;
  description?: string;
  estimatedResolution?: string;
}

export interface IAnnouncement {
  id: string;
  title: string;
  severity: 'info' | 'warning' | 'error';
  content: string;
}

export const MOCK_TICKETS: ITicket[] = [
  {
    id: 'TK-1024',
    title: 'VPN Connection Timeout',
    status: 'In Progress',
    date: '2026-02-24',
    category: 'IT Support',
    estimatedResolution: '2 hours'
  },
  {
    id: 'TK-0988',
    title: 'Missing HR Document Access',
    status: 'Awaiting Feedback',
    date: '2026-02-22',
    category: 'Human Resources'
  },
  {
    id: 'TK-1050',
    title: 'New Laptop Request',
    status: 'Pending',
    date: '2026-02-24',
    category: 'Hardware'
  }
];

export const MOCK_ANNOUNCEMENTS: IAnnouncement[] = [
  {
    id: 'ANN-01',
    title: 'Exchange Server Maintenance',
    severity: 'warning',
    content: 'Email services may be intermittent between 10 PM and 2 AM tonight.'
  },
  {
    id: 'ANN-02',
    title: 'New AI Assistant Online',
    severity: 'info',
    content: 'You can now use the smart search to find instant solutions to common issues.'
  }
];

export const MOCK_HISTORY: ITicket[] = [
  {
    id: 'TK-0850',
    title: 'Software Installation: Adobe Suite',
    status: 'Resolved',
    date: '2026-02-15',
    category: 'Software'
  }
];

export interface IUser {
  id: string;
  displayName: string;
  email: string;
  role: 'Admin' | 'Agent' | 'User';
  status: 'Active' | 'Inactive';
  lastLogin?: string;
}

export const MOCK_USERS: IUser[] = [
  {
    id: '1',
    displayName: 'Admin User',
    email: 'admin@motez.com',
    role: 'Admin',
    status: 'Active',
    lastLogin: '2026-03-10'
  },
  {
    id: '2',
    displayName: 'Agent Smith',
    email: 'smith@motez.com',
    role: 'Agent',
    status: 'Active',
    lastLogin: '2026-03-11'
  },
  {
    id: '3',
    displayName: 'John Doe',
    email: 'john@motez.com',
    role: 'User',
    status: 'Active',
    lastLogin: '2026-03-05'
  },
  {
    id: '4',
    displayName: 'Jane Doe',
    email: 'jane@motez.com',
    role: 'User',
    status: 'Inactive',
    lastLogin: '2026-02-28'
  }
];
