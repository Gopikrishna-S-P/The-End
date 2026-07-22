import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import BackgroundSyncIndicator from './BackgroundSyncIndicator';
import { backgroundSync } from '../utils/backgroundSync';

function Seeded({ progress, extra }: { progress?: number; extra?: number }) {
  useEffect(() => {
    const ids = [backgroundSync.start('Uploading visits.csv')];
    if (progress !== undefined) backgroundSync.setProgress(ids[0], progress);
    for (let i = 0; i < (extra ?? 0); i++) ids.push(backgroundSync.start(`Syncing job ${i + 2}`));
    return () => ids.forEach(id => backgroundSync.end(id));
  }, [progress, extra]);
  return <BackgroundSyncIndicator />;
}

const meta: Meta<typeof BackgroundSyncIndicator> = {
  title: 'Components/BackgroundSyncIndicator',
  component: BackgroundSyncIndicator,
};
export default meta;

type Story = StoryObj<typeof BackgroundSyncIndicator>;

export const Indeterminate: Story = { render: () => <Seeded /> };
export const WithProgress: Story = { render: () => <Seeded progress={0.62} /> };
export const MultipleJobs: Story = { render: () => <Seeded progress={0.3} extra={2} /> };
