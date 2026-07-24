import type { Meta, StoryObj } from '@storybook/react-vite';
import CaseAssignmentsPage from './CaseAssignmentsPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof CaseAssignmentsPage> = {
  title: 'Pages/Loans/CaseAssignmentsPage',
  component: CaseAssignmentsPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof CaseAssignmentsPage>;
export const Default: Story = {};
