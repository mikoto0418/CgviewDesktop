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
    <form className="project-form" onSubmit={handleSubmit}>
      <h3>{t('form.title')}</h3>
      <label className="project-form__field">
        <span>{t('form.nameLabel')}</span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('form.namePlaceholder')}
          required
          minLength={2}
        />
      </label>
      <label className="project-form__field">
        <span>{t('form.descriptionLabel')}</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t('form.descriptionPlaceholder')}
          rows={3}
        />
      </label>
      <div className="project-form__actions">
        <button type="submit" disabled={isSubmitting || !name.trim()}>
          {isSubmitting ? t('form.submitting') : t('form.submit')}
        </button>
      </div>
    </form>
  );
};
