import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import LoadingSplash from './LoadingSplash';
import { loadingSplash } from '../utils/loadingSplash';

function Shown({ message }: { message: string }) {
  useEffect(() => {
    loadingSplash.show(0, message);
    return () => loadingSplash.hide();
  }, [message]);
  return <LoadingSplash />;
}

const meta: Meta<typeof LoadingSplash> = {
  title: 'Components/LoadingSplash',
  component: LoadingSplash,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof LoadingSplash>;

export const SigningIn: Story = { render: () => <Shown message="Signing you in" /> };
export const RestoringSession: Story = { render: () => <Shown message="Restoring session" /> };
