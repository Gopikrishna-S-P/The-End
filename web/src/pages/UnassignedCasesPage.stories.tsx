import type { Meta, StoryObj } from '@storybook/react-vite';
import UnassignedCasesPage from './UnassignedCasesPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof UnassignedCasesPage> = {
  title: 'Pages/Loans/UnassignedCasesPage',
  component: UnassignedCasesPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof UnassignedCasesPage>;
export const Default: Story = {};
