import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectList } from './ProjectList';
import type { ProjectSummary } from '@shared/domain/project';

describe('ProjectList', () => {
  const mockProjects: ProjectSummary[] = [
    {
      id: 'project1',
      name: 'Test Project 1',
      description: 'Test description 1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'project2',
      name: 'Test Project 2',
      description: 'Test description 2',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应渲染项目列表', () => {
    render(<ProjectList projects={mockProjects} />);

    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    expect(screen.getByText('Test Project 2')).toBeInTheDocument();
  });

  it('应在没有项目时显示空状态', () => {
    render(<ProjectList projects={[]} />);

    expect(screen.getByText(/empty/i)).toBeInTheDocument();
    expect(screen.queryByText('Test Project 1')).not.toBeInTheDocument();
  });

  it('应高亮选中的项目', () => {
    const { container } = render(
      <ProjectList projects={mockProjects} selectedId="project1" />
    );

    // Check for the 'selected' class we added
    const activeItem = container.querySelector('.selected');
    expect(activeItem).toBeInTheDocument();
    expect(activeItem).toHaveTextContent('Test Project 1');
  });

  it('应在点击项目时调用onSelect', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <ProjectList projects={mockProjects} onSelect={onSelect} />
    );

    await user.click(screen.getByText('Test Project 1'));

    expect(onSelect).toHaveBeenCalledWith(mockProjects[0]);
  });

  it('应显示项目描述', () => {
    render(<ProjectList projects={mockProjects} />);

    expect(screen.getByText('Test description 1')).toBeInTheDocument();
  });

  it('应显示创建时间', () => {
    render(<ProjectList projects={mockProjects} />);
    // The date formatter outputs something like "01/01/2024" or similar depending on locale
    // We just check if the date string is present in some form
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });
});
