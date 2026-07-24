import type { Meta, StoryObj } from '@storybook/react-vite';
import RestructureProposalsPage from './RestructureProposalsPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof RestructureProposalsPage> = {
  title: 'Pages/Loans/RestructureProposalsPage',
  component: RestructureProposalsPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof RestructureProposalsPage>;
export const Default: Story = {};
