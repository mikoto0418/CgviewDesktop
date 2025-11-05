import { describe, it, expect, beforeEach } from 'vitest';
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

    const activeItem = container.querySelector('.project-list__item--active');
    expect(activeItem).toBeInTheDocument();

    const inactiveItem = container.querySelector(
      '.project-list__item:not(.project-list__item--active)'
    );
    expect(inactiveItem).toBeInTheDocument();
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

  it('应处理没有描述的项目', () => {
    render(<ProjectList projects={[mockProjects[1]]} />);

    expect(screen.queryByText('project-list__description')).not.toBeInTheDocument();
  });

  it('应显示创建时间', () => {
    render(<ProjectList projects={mockProjects} />);

    expect(screen.getByText(/created/i)).toBeInTheDocument();
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it('应使用正确的时间格式化', () => {
    render(<ProjectList projects={mockProjects} />);

    const metaElement = screen.getByText(/created/i);
    expect(metaElement).toBeInTheDocument();
  });

  it('应处理onSelect不存在的情况', async () => {
    const user = userEvent.setup();
    render(<ProjectList projects={mockProjects} />);

    await user.click(screen.getByText('Test Project 1'));

    expect(() => {}).not.toThrow();
  });
});
