import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import { workspace } from '../utils/workspace';

function Seeded({ multiple }: { multiple: boolean }) {
  useEffect(() => {
    const list = multiple
      ? [{ id: 'w1', name: 'Sri Nimishamba Associates' }, { id: 'w2', name: 'Recovery Partners LLP' }]
      : [{ id: 'w1', name: 'Sri Nimishamba Associates' }];
    workspace.setList(list);
    workspace.setCurrent(list[0]);
    return () => { workspace.setList([]); workspace.setCurrent(null); };
  }, [multiple]);
  return <WorkspaceSwitcher />;
}

const meta: Meta<typeof WorkspaceSwitcher> = {
  title: 'Components/WorkspaceSwitcher',
  component: WorkspaceSwitcher,
};
export default meta;

type Story = StoryObj<typeof WorkspaceSwitcher>;

export const SingleWorkspace: Story = { render: () => <Seeded multiple={false} /> };
export const MultipleWorkspaces: Story = { render: () => <Seeded multiple={true} /> };
