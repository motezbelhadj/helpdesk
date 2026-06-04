import * as React from 'react';
import { useState } from 'react';
import styles from './UserManagement.module.scss';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { IUser } from '../../helpdesk/MockData';

import { SPService } from '../../../services/SPService';

/**
 * Properties for the UserManagement component.
 */
export interface IUserManagementProps {
  isDarkTheme: boolean;          // Whether the dark theme is active
  context: WebPartContext;       // SharePoint context
  spService?: SPService;         // Optional SharePoint service instance
  onNavigateBack: () => void;    // Callback to return to the admin dashboard
}

/**
 * UserManagement Component
 * 
 * Provides an interface for administrators to manage helpdesk users,
 * including adding new users, changing roles, and activating/deactivating accounts.
 */
export const UserManagement: React.FC<IUserManagementProps> = (props) => {
  const { isDarkTheme, context } = props;
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
      // Querying the 'user' list with expanded organizational fields
      const listUrl = `${context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('user')/items?$select=Id,role,status,Department,JobTitle,Specialization,PhoneNumber,user/Title,user/EMail&$expand=user`;
      const response: SPHttpClientResponse = await context.spHttpClient.get(listUrl, SPHttpClient.configurations.v1);

      if (response.ok) {
        const data = await response.json();
        if (data.value) {
          const fetchedUsers: IUser[] = data.value.map((item: any) => ({
            id: item.Id.toString(),
            displayName: item.user?.Title || item.Title || 'Unknown User',
            email: item.user?.EMail || item.email || item.Email || 'No email',
            role: (item.role || item.Role || 'User') as any,
            status: (item.status || item.Status || 'Active') as any,
            lastLogin: item.LastLogin ? new Date(item.LastLogin).toLocaleDateString() : 'N/A',
            department: item.Department || '',
            jobTitle: item.JobTitle || '',
            specialization: item.Specialization || '',
            phoneNumber: item.PhoneNumber || ''
          }));
          setUsers(fetchedUsers);
        }
      } else {
        const errorData = await response.json();
        setError(`Failed to fetch users: ${errorData.error ? errorData.error.message.value : response.statusText}.`);
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
          if (props.spService) {
              await props.spService.updateUserProfile(parseInt(userId, 10), { role: newRole });
              setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
          }
        } catch (err) {
          console.error('Error updating role:', err);
          alert('Failed to update role.');
        }
      }
    });

  };

  /**
   * Universal field update handler for inline editing.
   */
  const handleUpdateUserField = async (userId: string, field: keyof IUser, value: string): Promise<void> => {
    try {
        if (props.spService) {
            const updates: any = {};
            // Map common display names to internal names if they differ
            const internalName = field === 'jobTitle' ? 'JobTitle' : field.charAt(0).toUpperCase() + field.slice(1);
            updates[internalName] = value;

            await props.spService.updateUserProfile(parseInt(userId, 10), updates);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: value } : u));
        }
    } catch (err) {
        console.error(`Error updating user ${field}:`, err);
    }
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
            if (props.spService) {
                await props.spService.updateUserProfile(parseInt(userId, 10), { status: newStatus });
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
            }
        } catch (err) {
          console.error('Error updating status:', err);
          alert('Failed to update status.');
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
                <th>Details</th>
                <th>Specialization</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{user.displayName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.email}</div>
                  </td>
                  <td>
                    <div className={styles.inlineInfo}>
                        <input 
                            placeholder="Job Title"
                            value={user.jobTitle} 
                            onBlur={(e) => handleUpdateUserField(user.id, 'jobTitle', e.target.value)}
                            onChange={(e) => setUsers(prev => prev.map(u => u.id === user.id ? { ...u, jobTitle: e.target.value } : u))}
                        />
                        <input 
                            placeholder="Department"
                            value={user.department} 
                            onBlur={(e) => handleUpdateUserField(user.id, 'department', e.target.value)}
                            onChange={(e) => setUsers(prev => prev.map(u => u.id === user.id ? { ...u, department: e.target.value } : u))}
                        />
                    </div>
                  </td>
                  <td>
                    <select 
                      className={styles.specializationSelect}
                      value={user.specialization} 
                      onChange={(e) => handleUpdateUserField(user.id, 'specialization', e.target.value)}
                    >
                      <option value="">No Spec</option>
                      <option value="Network">Network</option>
                      <option value="Hardware">Hardware</option>
                      <option value="Software">Software</option>
                      <option value="Cloud">Cloud</option>
                    </select>
                  </td>
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
