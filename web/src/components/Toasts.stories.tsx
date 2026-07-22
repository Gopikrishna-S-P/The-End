import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Toasts from './Toasts';
import { ToastProvider } from '../context/ToastContext';
import { toastBus } from '../utils/toastBus';

function Fire() {
  useEffect(() => {
    toastBus.success('Case reassigned', 'RP-88213 moved to Priya Menon.');
    toastBus.error('Upload failed', 'The file exceeded the 20MB limit.');
    toastBus.warn('Session expiring soon');
    toastBus.info('New version available — refresh to update.');
  }, []);
  return <Toasts />;
}

const meta: Meta<typeof Toasts> = {
  title: 'Components/Toasts',
  component: Toasts,
  decorators: [(Story) => <ToastProvider><Story /></ToastProvider>],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof Toasts>;

export const Default: Story = { render: () => <Fire /> };
