import * as React from 'react';
import { Stack, TextField, Dropdown, PrimaryButton, DefaultButton, IDropdownOption, MessageBar, MessageBarType, Dialog, DialogType, DialogFooter, Icon } from '@fluentui/react';
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
    const [showConfirm, setShowConfirm] = React.useState<boolean>(false);
    
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
        <div style={{ width: '100%' }}>
            {/* Dark Header */}
            <div className={styles.formHeader}>
                <h2>New Ticket</h2>
                <div className={styles.headerActions}>
                    <DefaultButton 
                        onClick={props.onClose} 
                        className={styles.backBtn}
                        onRenderIcon={() => <Icon iconName="Back" />}
                    >
                        Back
                    </DefaultButton>
                </div>
            </div>

            {/* White Form Card */}
            <div className={styles.formCard}>
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

                <Stack tokens={{ childrenGap: 24 }}>
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

                    {/* Custom Attachment Section */}
                    <div className={styles.attachmentSection}>
                        <Icon iconName="CloudUpload" className={styles.uploadIcon} />
                        <span className={styles.uploadLabel}>Attachment</span>
                        <div className={styles.uploadControls}>
                            <label className={styles.customFileInput}>
                                Choisir un fichier
                                <input 
                                    type="file" 
                                    style={{ display: 'none' }} 
                                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} 
                                />
                            </label>
                            <span className={styles.fileName}>
                                {file ? file.name : "Aucun fichier n'a été sélectionné"}
                            </span>
                        </div>
                        <p className={styles.uploadHint}>ACCEPTED FORMATS: IMAGES, PDF, DOCS (MAX 10MB)</p>
                    </div>

                    <div className={styles.submitSection}>
                        <PrimaryButton
                            text={submitting ? "Submitting..." : "Submit Ticket"}
                            onClick={() => setShowConfirm(true)}
                            disabled={submitting || !title || !category || !description}
                            className={styles.submitBtn}
                            onRenderIcon={() => <Icon iconName="Send" />}
                        />
                    </div>
                </Stack>
            </div>

            {/* Bottom Info Cards */}
            <div className={styles.infoCards}>
                <div className={`${styles.infoCard} ${styles.blue}`}>
                    <Icon iconName="Timer" />
                    <h4>Typical Response Time</h4>
                    <p>Standard priority tickets are usually addressed within 4 hours by our IT staff.</p>
                </div>
                <div className={styles.infoCard}>
                    <Icon iconName="AutoEnhanceOn" />
                    <h4>AI Suggestion</h4>
                    <p>Our Agent AI might provide instant solutions once you describe the issue.</p>
                </div>
                <div className={styles.infoCard}>
                    <Icon iconName="Shield" />
                    <h4>Company Policy</h4>
                    <p>All hardware requests require supervisor approval before fulfillment.</p>
                </div>
            </div>

            <Dialog
                hidden={!showConfirm}
                onDismiss={() => setShowConfirm(false)}
                dialogContentProps={{
                    type: DialogType.normal,
                    title: 'Confirm Ticket Creation',
                    subText: 'Are you sure you want to submit this new ticket? Helpdesk agents will be notified immediately.'
                }}
            >
                <DialogFooter>
                    <PrimaryButton onClick={() => { setShowConfirm(false); handleSubmit(); }} text="Yes, Submit" disabled={submitting} />
                    <DefaultButton onClick={() => setShowConfirm(false)} text="Cancel" disabled={submitting} />
                </DialogFooter>
            </Dialog>
        </div>
    );
};
