import * as React from 'react';
import { useState } from 'react';
import styles from './UserManagement.module.scss';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { IUser } from '../../helpdesk/MockData';

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
  const [confirmDialog, setConfirmDialog] = useState<{message: string, onConfirm: () => void} | null>(null);
  
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

  const handleRoleChange = async (userId: string, newRole: 'Admin' | 'Agent' | 'User'): Promise<void> => {
    setConfirmDialog({
      message: `Are you sure you want to change the role to ${newRole}?`,
      onConfirm: async () => {
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
      }
    });
  };

  const toggleStatus = async (userId: string): Promise<void> => {
    const userArray = users.filter((u: IUser) => u.id === userId);
    if (userArray.length === 0) return;
    const user = userArray[0];

    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    setConfirmDialog({
      message: `Are you sure you want to change this user's status to ${newStatus}?`,
      onConfirm: async () => {
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
      }
    });
  };

  const handleAddUser = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!newUserEmail.trim()) {
      alert('Please enter an email address.');
      return;
    }

    setConfirmDialog({
      message: `Are you sure you want to add ${newUserEmail} to the Helpdesk as an ${newUserRole}?`,
      onConfirm: async () => {
        setIsAddingUser(true);
        try {
          // 1. Resolve the user in SharePoint to get their Site ID
          const ensureUserUrl = `${context.pageContext.web.absoluteUrl}/_api/web/ensureuser`;
          const ensureResponse = await context.spHttpClient.post(ensureUserUrl, SPHttpClient.configurations.v1, {
            headers: {
              'Accept': 'application/json;odata=nometadata',
              'Content-type': 'application/json;odata=nometadata',
              'odata-version': ''
            },
            body: JSON.stringify({ logonName: newUserEmail })
          });

          if (!ensureResponse.ok) {
            throw new Error(`Failed to resolve user ${newUserEmail}. Ensure it is a valid M365 account.`);
          }

          const userData = await ensureResponse.json();
          const spUserId = userData.Id;
          const userDisplayName = userData.Title || newUserEmail;

          // 2. Add the user to the custom list
          const listUrl = `${context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('user')/items`;
          const addResponse = await context.spHttpClient.post(listUrl, SPHttpClient.configurations.v1, {
            headers: {
              'Accept': 'application/json;odata=nometadata',
              'Content-type': 'application/json;odata=nometadata',
              'odata-version': ''
            },
            body: JSON.stringify({
              Title: userDisplayName,
              userIdId: spUserId, // Ensure this matches the internal name of your Person column (e.g. userId, userIdId)
              role: newUserRole,
              status: 'Active'
            })
          });

          if (addResponse.ok) {
            alert('User added successfully!');
            setNewUserEmail('');
            setNewUserRole('User');
            fetchUsers().catch(err => console.error(err)); // Refresh list
          } else {
            const errData = await addResponse.json();
            alert(`Failed to add user to list: ${errData.error?.message?.value || 'Unknown error'}`);
          }
        } catch (err: any) {
          console.error('Error adding user:', err);
          alert(err.message || 'An unexpected error occurred while adding the user.');
        } finally {
          setIsAddingUser(false);
        }
      }
    });
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
      {/* Custom Confirmation Modal */}
      {confirmDialog && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Confirm Action</h3>
            <p>{confirmDialog.message}</p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirmDialog(null)}>Cancel</button>
              <button className={styles.confirmBtn} onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog(null);
              }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
