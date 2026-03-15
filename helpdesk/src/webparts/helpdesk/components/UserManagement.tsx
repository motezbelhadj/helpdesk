import * as React from 'react';
import { useState } from 'react';
import styles from './UserManagement.module.scss';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { IUser } from '../MockData';

export interface IUserManagementProps {
  isDarkTheme: boolean;
  context: WebPartContext;
  onNavigateBack: () => void;
}

export const UserManagement: React.FC<IUserManagementProps> = (props) => {
  const { isDarkTheme, context, onNavigateBack } = props;
  const [users, setUsers] = useState<IUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // New User Form State
  const [isAddingUser, setIsAddingUser] = useState<boolean>(false);
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<'Admin' | 'Agent' | 'User'>('User');
  
  const fetchUsers = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      // Querying the 'user' list and expanding the 'Personne' (Person) column
      const listUrl = `${context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('user')/items?$select=Id,role,status,user/Title,user/EMail&$expand=user`;
      const response: SPHttpClientResponse = await context.spHttpClient.get(listUrl, SPHttpClient.configurations.v1);

      if (response.ok) {
        const data = await response.json();
        if (data.value) {
          console.log('Raw SharePoint Users Data:', data.value);
          const fetchedUsers: IUser[] = data.value.map((item: any) => ({
            id: item.Id.toString(),
            displayName: item.user?.Title || item.Title || 'Unknown User',
            email: item.user?.EMail || item.email || item.Email || 'No email',
            role: (item.role || item.Role || 'User') as any, // Default to User if empty
            status: (item.status || item.Status || 'Active') as any,
            lastLogin: item.LastLogin ? new Date(item.LastLogin).toLocaleDateString() : 'N/A'
          }));
          setUsers(fetchedUsers);
        }
      } else {
        const errorData = await response.json();
        setError(`Failed to fetch users: ${errorData.error ? errorData.error.message.value : response.statusText}. Please ensure a 'user' list exists.`);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('An unexpected error occurred while fetching users.');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchUsers().catch(err => console.error(err));
  }, []);

  const handleRoleChange = async (userId: string, newRole: 'Admin' | 'Agent' | 'User') => {
    try {
      const listUrl = `${context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('user')/items(${userId})`;
      const response = await context.spHttpClient.post(listUrl, SPHttpClient.configurations.v1, {
        headers: {
          'Accept': 'application/json;odata=nometadata',
          'Content-type': 'application/json;odata=nometadata',
          'odata-version': '',
          'IF-MATCH': '*',
          'X-HTTP-Method': 'MERGE'
        },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        console.log(`User ${userId} role updated to ${newRole} in SharePoint`);
      } else {
        alert('Failed to update role in SharePoint.');
      }
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  const toggleStatus = async (userId: string) => {
    const userArray = users.filter((u: IUser) => u.id === userId);
    if (userArray.length === 0) return;
    const user = userArray[0];

    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const listUrl = `${context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('user')/items(${userId})`;
      const response = await context.spHttpClient.post(listUrl, SPHttpClient.configurations.v1, {
        headers: {
          'Accept': 'application/json;odata=nometadata',
          'Content-type': 'application/json;odata=nometadata',
          'odata-version': '',
          'IF-MATCH': '*',
          'X-HTTP-Method': 'MERGE'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        console.log(`User ${userId} status updated to ${newStatus} in SharePoint`);
      } else {
        alert('Failed to update status in SharePoint.');
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) {
      alert('Please enter an email address.');
      return;
    }

    setIsAddingUser(true);
    try {
      // 1. Resolve the user in SharePoint to get their Site ID
      const ensureUserUrl = `${context.pageContext.web.absoluteUrl}/_api/web/ensureuser('${newUserEmail}')`;
      const ensureRes = await context.spHttpClient.post(ensureUserUrl, SPHttpClient.configurations.v1, {
        headers: { 'Accept': 'application/json;odata=nometadata' }
      });

      let sharePointUserId = null;
      let displayName = 'Unknown';
      if (ensureRes.ok) {
        const userInfo = await ensureRes.json();
        sharePointUserId = userInfo.Id;
        displayName = userInfo.Title;
      } else {
        alert('Could not find this user in your organization. Please check the email.');
        setIsAddingUser(false);
        return;
      }

      // 2. Add to the custom 'user' list
      const listUrl = `${context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('user')/items`;
      const addRes = await context.spHttpClient.post(listUrl, SPHttpClient.configurations.v1, {
        headers: {
          'Accept': 'application/json;odata=nometadata',
          'Content-type': 'application/json;odata=nometadata'
        },
        body: JSON.stringify({
          Title: displayName,
          userId: sharePointUserId, // OData expects [ColumnName]Id for Person fields
          role: newUserRole,
          status: 'Active'
        })
      });

      if (addRes.ok) {
        const newItem = await addRes.json();
        setUsers(prev => [...prev, {
          id: newItem.Id.toString(),
          displayName: displayName,
          email: newUserEmail,
          role: newUserRole,
          status: 'Active',
          lastLogin: 'Never'
        }]);
        setNewUserEmail('');
        setNewUserRole('User');
        console.log(`Successfully added user ${displayName}`);
      } else {
        const errData = await addRes.json();
        alert(`Failed to add user to list: ${errData.error?.message?.value || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error adding user:', err);
      alert('An unexpected error occurred while adding the user.');
    } finally {
      setIsAddingUser(false);
    }
  };

  return (
    <div className={`${styles.userManagement} ${isDarkTheme ? styles.dark : ''}`}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>User Management</h2>
          <p>Control user access, roles, and account status from SharePoint.</p>
        </div>
        <button className={styles.backButton} onClick={onNavigateBack}>
          Back to Admin Dashboard
        </button>
      </header>

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #fca5a5' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Add New User Form */}
      <div className={styles.addUserForm}>
        <h3>Add New User</h3>
        <form onSubmit={handleAddUser} className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label htmlFor="userEmail">Microsoft 365 Email</label>
            <input 
              id="userEmail"
              type="email" 
              placeholder="user@yourcompany.com" 
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              disabled={isAddingUser}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="userRole">Assign Role</label>
            <select 
              id="userRole"
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as any)}
              disabled={isAddingUser}
            >
              <option value="Admin">Admin</option>
              <option value="Agent">Agent</option>
              <option value="User">User</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <button 
              type="submit" 
              className={styles.submitBtn} 
              disabled={isAddingUser || !newUserEmail}
            >
              {isAddingUser ? 'Adding...' : 'Add User to Helpdesk'}
            </button>
          </div>
        </form>
      </div>

      <div className={styles.tableContainer}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading users from SharePoint...</div>
        ) : (
          <table className={styles.userTable}>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{user.displayName}</div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <select 
                      className={styles.actionSelect}
                      value={user.role} 
                      onChange={(e) => handleRoleChange(user.id, e.target.value as any)}
                    >
                      <option value="Admin">Admin</option>
                      <option value="Agent">Agent</option>
                      <option value="User">User</option>
                    </select>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${user.status === 'Active' ? styles.statusActive : styles.statusInactive}`}>
                      {user.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.9em' }}>
                    {user.lastLogin || 'Never'}
                  </td>
                  <td>
                    <button 
                      className={`${styles.statusButton} ${user.status === 'Active' ? styles.deactivate : ''}`}
                      onClick={() => toggleStatus(user.id)}
                    >
                      {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && !isLoading && !error && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    No users found in the 'user' list.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
