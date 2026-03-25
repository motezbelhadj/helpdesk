import * as React from 'react';
import { Stack, TextField, Dropdown, PrimaryButton, IDropdownOption, MessageBar, MessageBarType } from '@fluentui/react';
import { SPService } from '../../../services/SPService';
import styles from './TicketForm.module.scss';

export interface ITicketFormProps {
    spService: SPService;
    currentUserDisplayName: string;
    onClose: () => void;
}

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
        { key: 'Support IT', text: 'Support IT' },
        { key: 'RH', text: 'RH' },
        { key: 'Logistique', text: 'Logistique' },
        { key: 'Autre', text: 'Autre' },
    ];

    const priorityOptions: IDropdownOption[] = [
        { key: 'Basse', text: 'Basse' },
        { key: 'Normale', text: 'Normale' },
        { key: 'Haute', text: 'Haute' },
        { key: 'Urgente', text: 'Urgente' },
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
                Priorite: priority ? priority.key as string : 'Normale',
                Description: description,
                Status: 'New'
            };

            await props.spService.createTicket(payload, file);

            setSuccess(`Ticket créé avec succès ! Référence : ${refNumber}`);
            setTitle('');
            setCategory(undefined);
            setPriority(undefined);
            setDescription('');
            setFile(null);
            
            setTimeout(() => {
                props.onClose();
            }, 2500);
        } catch (err) {
            setError('Échec de la création du ticket. Veuillez réessayer.');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.ticketFormContainer}>
            <div className={styles.glassCard}>
                <div className={styles.header}>
                    <h2>Nouveau Ticket</h2>
                    <PrimaryButton 
                        text="Retour" 
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
                        label="Titre"
                        placeholder="De quoi s'agit-il ?"
                        required
                        value={title}
                        onChange={(_, val) => setTitle(val || '')}
                    />

                    <div className={styles.formGrid}>
                        <Dropdown
                            label="Catégorie"
                            placeholder="Choisir une catégorie"
                            required
                            options={categoryOptions}
                            selectedKey={category ? category.key : undefined}
                            onChange={(_, option) => setCategory(option)}
                        />

                        <Dropdown
                            label="Priorité"
                            placeholder="Choisir l'urgence"
                            required
                            options={priorityOptions}
                            selectedKey={priority ? priority.key : undefined}
                            onChange={(_, option) => setPriority(option)}
                        />
                    </div>

                    <TextField
                        label="Description"
                        placeholder="Décrivez votre problème en détail..."
                        multiline
                        rows={6}
                        required
                        value={description}
                        onChange={(_, val) => setDescription(val || '')}
                    />

                    <div className={styles.fileInputWrapper}>
                        <label className={styles.fieldLabel}>Pièce jointe</label>
                        <input type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
                        <p style={{ fontSize: '0.8em', color: '#64748b', marginTop: 8 }}>Formats acceptés: Images, PDF, Docs (Max 10MB)</p>
                    </div>

                    <div className={styles.actions}>
                        <PrimaryButton
                            text={submitting ? "Envoi en cours..." : "Soumettre le Ticket"}
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
