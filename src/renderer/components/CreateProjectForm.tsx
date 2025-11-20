import { useState } from 'react';
import type { CreateProjectInput } from '@shared/domain/project';
import { useTranslation } from 'react-i18next';

type CreateProjectFormProps = {
  onSubmit: (input: CreateProjectInput) => Promise<void> | void;
  isSubmitting?: boolean;
};

export const CreateProjectForm = ({
  onSubmit,
  isSubmitting = false
}: CreateProjectFormProps) => {
  const { t } = useTranslation('projects');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    await onSubmit({
      name: name.trim(),
      description: description.trim() ? description.trim() : undefined
    });

    setName('');
    setDescription('');
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Title removed, handled by parent/modal */}
      
      <div className="flex-col gap-2 mb-4">
        <label htmlFor="projectName" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--system-text-secondary)' }}>
          {t('form.nameLabel')}
        </label>
        <input
          id="projectName"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('form.namePlaceholder')}
          required
          minLength={2}
        />
      </div>

      <div className="flex-col gap-2 mb-4">
        <label htmlFor="projectDescription" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--system-text-secondary)' }}>
          {t('form.descriptionLabel')}
        </label>
        <textarea
          id="projectDescription"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t('form.descriptionPlaceholder')}
          rows={3}
          style={{ resize: 'none' }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          type="submit" 
          disabled={isSubmitting || !name.trim()}
          className="btn-apple"
        >
          {isSubmitting ? t('form.submitting') : t('form.submit')}
        </button>
      </div>
    </form>
  );
};
