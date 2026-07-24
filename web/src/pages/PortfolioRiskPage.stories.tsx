import type { Meta, StoryObj } from '@storybook/react-vite';
import PortfolioRiskPage from './PortfolioRiskPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof PortfolioRiskPage> = {
  title: 'Pages/Loans/PortfolioRiskPage',
  component: PortfolioRiskPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof PortfolioRiskPage>;
export const Default: Story = {};
