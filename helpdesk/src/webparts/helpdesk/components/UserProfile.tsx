import * as React from 'react';
import { useState, useEffect } from 'react';
import styles from './UserProfile.module.scss';
import { SPService } from '../../../services/SPService';
import { Icon } from '@fluentui/react';

/**
 * Properties for the UserProfile component.
 */
interface IUserProfileProps {
  userDisplayName: string;
  userEmail: string;
  isDarkTheme: boolean;
  spService: SPService;
  onBack: () => void;
}

/**
 * UserProfile Component
 * 
 * Displays the current user's profile information and allows editing of 
 * organizational details (Department, Job Title, Specialization, Phone).
 */
export const UserProfile: React.FC<IUserProfileProps> = (props) => {
  const { userDisplayName, userEmail, isDarkTheme, spService, onBack } = props;
  
  // Profile Data States
  const [userListItemId, setUserListItemId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<'Admin' | 'Agent' | 'User' | null>(null);
  const [userStatus, setUserStatus] = useState<string>('Active');
  const [stats, setStats] = useState({ total: 0, resolved: 0, pending: 0 });
  
  // Editable Fields
  const [department, setDepartment] = useState<string>('');
  const [jobTitle, setJobTitle] = useState<string>('');
  const [specialization, setSpecialization] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');

  // UI States
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const fetchUserData = async (): Promise<void> => {
      try {
        // 1. Fetch User List Item for additional info
        const userItem = await spService.getCurrentUserListItem();
        if (userItem) {
            setUserListItemId(userItem.Id);
            setUserRole(userItem.role || userItem.Role || 'User');
            setUserStatus(userItem.status || userItem.Status || 'Active');
            setDepartment(userItem.Department || '');
            setJobTitle(userItem.JobTitle || '');
            setSpecialization(userItem.Specialization || '');
            setPhoneNumber(userItem.PhoneNumber || '');
        }

        // 2. Fetch User Stats (Tickets)
        const user = await spService._sp.web.currentUser();
        const tickets = await spService.getUserTickets(user.Id);
        const resolved = tickets.filter(t => {
            const s = (t.Status || t.Statut || t.status || '').toLowerCase().trim();
            return s === 'resolved' || s === 'résolu' || s === 'resolu' || s === 'résolue';
        }).length;
        
        setStats({
          total: tickets.length,
          resolved: resolved,
          pending: tickets.length - resolved
        });

      } catch (error) {
        console.error('Error fetching profile data:', error);
      }
    };

    fetchUserData().catch(err => console.error(err));
  }, [spService]);

  const handleSave = async (): Promise<void> => {
    if (!userListItemId) return;

    setIsSaving(true);
    try {
        await spService.updateUserProfile(userListItemId, {
            Department: department,
            JobTitle: jobTitle,
            Specialization: specialization,
            PhoneNumber: phoneNumber
        });
        
        setIsEditing(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
        alert('Failed to save profile changes. Please try again.');
        console.error(error);
    } finally {
        setIsSaving(false);
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className={`${styles.userProfile} ${isDarkTheme ? styles.dark : ''}`}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={onBack}>
          <Icon iconName="Back" />
          Back to Dashboard
        </button>
        <h2>Account Profile</h2>
        <p style={{ opacity: 0.9, fontSize: '1.1rem' }}>Manage your personal helpdesk preferences and view account status.</p>
      </header>

      <div className={styles.profileCard}>
        <div className={styles.topSection}>
          <div className={styles.avatarContainer}>
            {getInitials(userDisplayName)}
          </div>
          <div className={styles.userInfo}>
            <h1>{userDisplayName}</h1>
            <p className={styles.userEmail}>{userEmail}</p>
          </div>
          <div className={styles.actionArea}>
              {isEditing ? (
                  <>
                    <button className={`${styles.editBtn} ${styles.cancel}`} onClick={() => setIsEditing(false)} disabled={isSaving}>
                        Cancel
                    </button>
                    <button className={`${styles.editBtn} ${styles.save}`} onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
              ) : (
                <button className={styles.editBtn} onClick={() => setIsEditing(true)}>
                    <Icon iconName="Edit" style={{ marginRight: '8px' }} />
                    Edit Profile
                </button>
              )}
          </div>
        </div>

        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <label>Organization Role</label>
            <div className={styles.value}>
              <span className={`${styles.roleBadge} ${userRole?.toLowerCase() || 'user'}`}>
                <Icon iconName={userRole === 'Admin' ? 'Admin' : userRole === 'Agent' ? 'Headset' : 'Contact'} style={{ marginRight: '8px' }} />
                {userRole || 'User'}
              </span>
            </div>
          </div>
          <div className={styles.detailItem}>
            <label>Service Status</label>
            <div className={styles.value}>
              <span className={styles.statusBadge}>
                <Icon iconName="Completed" style={{ marginRight: '8px' }} />
                {userStatus}
              </span>
            </div>
          </div>

          {/* Editable Fields */}
          <div className={styles.detailItem}>
            <label>Department</label>
            <div className={styles.value}>
                {isEditing ? (
                    <input 
                        value={department} 
                        onChange={(e) => setDepartment(e.target.value)} 
                        placeholder="e.g. Finance, IT, HR"
                    />
                ) : (
                    department || <span style={{ opacity: 0.5 }}>Not specified</span>
                )}
            </div>
          </div>

          <div className={styles.detailItem}>
            <label>Job Title</label>
            <div className={styles.value}>
                {isEditing ? (
                    <input 
                        value={jobTitle} 
                        onChange={(e) => setJobTitle(e.target.value)} 
                        placeholder="e.g. Senior Analyst"
                    />
                ) : (
                    jobTitle || <span style={{ opacity: 0.5 }}>Not specified</span>
                )}
            </div>
          </div>

          <div className={styles.detailItem}>
            <label>Specialization</label>
            <div className={styles.value}>
                {isEditing ? (
                    <select value={specialization} onChange={(e) => setSpecialization(e.target.value)}>
                        <option value="">Select Specialization</option>
                        <option value="Network">Networking</option>
                        <option value="Hardware">Hardware</option>
                        <option value="Software">Software</option>
                        <option value="Cloud">Cloud Services</option>
                        <option value="Security">Security</option>
                    </select>
                ) : (
                    specialization || <span style={{ opacity: 0.5 }}>Not specified</span>
                )}
            </div>
          </div>

          <div className={styles.detailItem}>
            <label>Phone Number</label>
            <div className={styles.value}>
                {isEditing ? (
                    <input 
                        value={phoneNumber} 
                        onChange={(e) => setPhoneNumber(e.target.value)} 
                        placeholder="+XX XXXXXXXX"
                    />
                ) : (
                    phoneNumber || <span style={{ opacity: 0.5 }}>Not specified</span>
                )}
            </div>
          </div>
        </div>

        <div className={styles.statsSection}>
          <h3>Your Service Activity</h3>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{stats.total}</span>
              <span className={styles.statLabel}>Total Requests</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue} style={{ color: '#107c10' }}>{stats.resolved}</span>
              <span className={styles.statLabel}>Successfully Resolved</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue} style={{ color: '#223445' }}>{stats.pending}</span>
              <span className={styles.statLabel}>Pending Resolution</span>
            </div>
          </div>
        </div>
      </div>

      {showSuccess && (
          <div className={styles.successToast}>
              <Icon iconName="CheckMark" />
              Profile updated successfully!
          </div>
      )}
    </div>
  );
};
