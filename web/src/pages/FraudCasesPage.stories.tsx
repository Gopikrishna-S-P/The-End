import type { Meta, StoryObj } from '@storybook/react-vite';
import FraudCasesPage from './FraudCasesPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('ORG_ADMIN');

const meta: Meta<typeof FraudCasesPage> = {
  title: 'Pages/Loans/FraudCasesPage',
  component: FraudCasesPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof FraudCasesPage>;
export const Default: Story = {};
