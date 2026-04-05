import * as React from 'react';
import { Stack, TextField, Dropdown, PrimaryButton, IDropdownOption, MessageBar, MessageBarType } from '@fluentui/react';
import { SPService } from '../../../services/SPService';
import styles from './TicketForm.module.scss';

/**
 * Properties for the TicketForm component.
 */
export interface ITicketFormProps {
    spService: SPService;           // Service for SharePoint operations
    currentUserDisplayName: string; // The display name of the current user
    onClose: () => void;            // Callback to close the form
}

/**
 * TicketForm Component
 * 
 * Provides a form interface for users to create new helpdesk tickets,
 * including fields for title, category, priority, and description.
 */
export const TicketForm: React.FunctionComponent<ITicketFormProps> = (props) => {
    const [title, setTitle] = React.useState<string>('');
    const [category, setCategory] = React.useState<IDropdownOption>();
    const [priority, setPriority] = React.useState<IDropdownOption>();
    const [description, setDescription] = React.useState<string>('');
    const [file, setFile] = React.useState<File | null>(null);
    const [submitting, setSubmitting] = React.useState<boolean>(false);
    const [success, setSuccess] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    const categoryOptions: IDropdownOption[] = [
        { key: 'Hardware', text: 'Hardware' },
        { key: 'Software', text: 'Software' },
        { key: 'Support IT', text: 'IT Support' },
        { key: 'HR', text: 'HR' },
        { key: 'Functional', text: 'Functional' },
        { key: 'Other', text: 'Other' },
    ];

    const priorityOptions: IDropdownOption[] = [
        { key: 'Low', text: 'Low' },
        { key: 'Normal', text: 'Normal' },
        { key: 'High', text: 'High' },
        { key: 'Urgent', text: 'Urgent' },
    ];

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const refNumber = `TKT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;

            const payload = {
                Title: title,
                Reference: refNumber,
                Categorie: category ? category.key as string : '',
                Priorite: priority ? priority.key as string : 'Normal',
                Description: description,
                Status: 'Pending'
            };

            await props.spService.createTicket(payload, file);

            setSuccess(`Ticket created successfully! Reference: ${refNumber}`);
            setTitle('');
            setCategory(undefined);
            setPriority(undefined);
            setDescription('');
            setFile(null);
            
            setTimeout(() => {
                props.onClose();
            }, 2500);
        } catch (err) {
            setError('Failed to create ticket. Please try again.');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.ticketFormContainer}>
            <div className={styles.glassCard}>
                <div className={styles.header}>
                    <h2>New Ticket</h2>
                    <PrimaryButton 
                        text="Back" 
                        onClick={props.onClose} 
                        className={styles.backButton}
                    />
                </div>
                
                {success && (
                    <MessageBar messageBarType={MessageBarType.success} onDismiss={() => setSuccess(null)} style={{ marginBottom: 20 }}>
                        {success}
                    </MessageBar>
                )}
                {error && (
                    <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setError(null)} style={{ marginBottom: 20 }}>
                        {error}
                    </MessageBar>
                )}

                <Stack tokens={{ childrenGap: 20 }}>
                    <TextField
                        label="Title"
                        placeholder="What is the issue?"
                        required
                        value={title}
                        onChange={(_, val) => setTitle(val || '')}
                    />

                    <div className={styles.formGrid}>
                        <Dropdown
                            label="Category"
                            placeholder="Select a category"
                            required
                            options={categoryOptions}
                            selectedKey={category ? category.key : undefined}
                            onChange={(_, option) => setCategory(option)}
                        />

                        <Dropdown
                            label="Priority"
                            placeholder="Select urgency"
                            required
                            options={priorityOptions}
                            selectedKey={priority ? priority.key : undefined}
                            onChange={(_, option) => setPriority(option)}
                        />
                    </div>

                    <TextField
                        label="Description"
                        placeholder="Describe your issue in detail..."
                        multiline
                        rows={6}
                        required
                        value={description}
                        onChange={(_, val) => setDescription(val || '')}
                    />

                    <div className={styles.fileInputWrapper}>
                        <label className={styles.fieldLabel}>Attachment</label>
                        <input type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
                        <p style={{ fontSize: '0.8em', color: '#64748b', marginTop: 8 }}>Accepted formats: Images, PDF, Docs (Max 10MB)</p>
                    </div>

                    <div className={styles.actions}>
                        <PrimaryButton
                            text={submitting ? "Submitting..." : "Submit Ticket"}
                            onClick={handleSubmit}
                            disabled={submitting || !title || !category || !description}
                            className={styles.submitButton}
                        />
                    </div>
                </Stack>
            </div>
        </div>
    );
};
