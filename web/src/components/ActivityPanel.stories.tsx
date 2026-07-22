import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import ActivityPanel from './ActivityPanel';
import { activityLog } from '../utils/activityLog';

function Seeded() {
  useEffect(() => {
    activityLog.log({ kind: 'visit', label: 'Borrowers', detail: 'Viewed borrower list', path: '/app/borrowers' });
    activityLog.log({ kind: 'action', label: 'Assigned RP-88213 to Priya Menon' });
  }, []);
  return <ActivityPanel open onClose={fn()} onNavigate={fn()} />;
}

const meta: Meta<typeof ActivityPanel> = {
  title: 'Components/ActivityPanel',
  component: ActivityPanel,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof ActivityPanel>;

export const WithEntries: Story = { render: () => <Seeded /> };
export const Empty: Story = { args: { open: true, onClose: fn(), onNavigate: fn() } };
