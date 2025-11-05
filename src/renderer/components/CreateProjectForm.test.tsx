import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateProjectForm } from './CreateProjectForm';

describe('CreateProjectForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应渲染表单', () => {
    render(<CreateProjectForm onSubmit={mockOnSubmit} />);

    expect(screen.getByText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nameLabel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descriptionLabel/i)).toBeInTheDocument();
  });

  it('应在提交时调用onSubmit', async () => {
    const user = userEvent.setup();
    render(<CreateProjectForm onSubmit={mockOnSubmit} />);

    const nameInput = screen.getByLabelText(/nameLabel/i);
    const descriptionInput = screen.getByLabelText(/descriptionLabel/i);
    const submitButton = screen.getByRole('button', { name: /form.submit/i });

    await user.type(nameInput, 'Test Project');
    await user.type(descriptionInput, 'Test Description');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Test Project',
        description: 'Test Description'
      });
    });
  });

  it('应在空名称时不提交', async () => {
    const user = userEvent.setup();
    render(<CreateProjectForm onSubmit={mockOnSubmit} />);

    const descriptionInput = screen.getByLabelText(/descriptionLabel/i);
    const submitButton = screen.getByRole('button', { name: /form.submit/i });

    await user.type(descriptionInput, 'Test Description');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  it('应在提交后清空表单', async () => {
    const user = userEvent.setup();
    render(<CreateProjectForm onSubmit={mockOnSubmit} />);

    const nameInput = screen.getByLabelText(/nameLabel/i);
    const descriptionInput = screen.getByLabelText(/descriptionLabel/i);

    await user.type(nameInput, 'Test Project');
    await user.type(descriptionInput, 'Test Description');
    await user.click(screen.getByRole('button', { name: /form.submit/i }));

    await waitFor(() => {
      expect(nameInput).toHaveValue('');
      expect(descriptionInput).toHaveValue('');
    });
  });

  it('应在没有描述时提交undefined', async () => {
    const user = userEvent.setup();
    render(<CreateProjectForm onSubmit={mockOnSubmit} />);

    const nameInput = screen.getByLabelText(/nameLabel/i);
    const submitButton = screen.getByRole('button', { name: /form.submit/i });

    await user.type(nameInput, 'Test Project');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Test Project',
        description: undefined
      });
    });
  });

  it('应在提交时禁用按钮', async () => {
    const user = userEvent.setup();
    const slowSubmit = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<CreateProjectForm onSubmit={slowSubmit} />);

    const nameInput = screen.getByLabelText(/nameLabel/i);
    const submitButton = screen.getByRole('button', { name: /form.submit/i });

    await user.type(nameInput, 'Test Project');
    await user.click(submitButton);

    expect(screen.getByText(/form.submitting/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(slowSubmit).toHaveBeenCalled();
    });
  });

  it('应在名称只有空格时不提交', async () => {
    const user = userEvent.setup();
    render(<CreateProjectForm onSubmit={mockOnSubmit} />);

    const nameInput = screen.getByLabelText(/nameLabel/i);
    const submitButton = screen.getByRole('button', { name: /form.submit/i });

    await user.type(nameInput, '   ');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  it('应在描述只有空格时提交undefined', async () => {
    const user = userEvent.setup();
    render(<CreateProjectForm onSubmit={mockOnSubmit} />);

    const nameInput = screen.getByLabelText(/nameLabel/i);
    const descriptionInput = screen.getByLabelText(/descriptionLabel/i);

    await user.type(nameInput, 'Test Project');
    await user.type(descriptionInput, '   ');
    await user.click(screen.getByRole('button', { name: /form.submit/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Test Project',
        description: undefined
      });
    });
  });

  it('应有正确的输入约束', () => {
    render(<CreateProjectForm onSubmit={mockOnSubmit} />);

    const nameInput = screen.getByLabelText(/nameLabel/i);
    expect(nameInput).toHaveAttribute('required');
    expect(nameInput).toHaveAttribute('minlength', '2');
  });

  it('应正确处理表单重置', async () => {
    const user = userEvent.setup();
    render(<CreateProjectForm onSubmit={mockOnSubmit} />);

    const nameInput = screen.getByLabelText(/nameLabel/i);
    const descriptionInput = screen.getByLabelText(/descriptionLabel/i);

    await user.type(nameInput, 'Test Project');
    await user.type(descriptionInput, 'Test Description');
    await user.click(screen.getByRole('button', { name: /form.submit/i }));

    await waitFor(() => {
      expect(nameInput).toHaveValue('');
    });

    await user.type(nameInput, 'New Project');
    await user.click(screen.getByRole('button', { name: /form.submit/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(2);
      expect(mockOnSubmit).toHaveBeenNthCalledWith(2, {
        name: 'New Project',
        description: undefined
      });
    });
  });
});
