import type { Meta, StoryObj } from '@storybook/react-vite';
import StartVisitPage from './StartVisitPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('FO');

const meta: Meta<typeof StartVisitPage> = {
  title: 'Pages/FieldOps/StartVisitPage',
  component: StartVisitPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof StartVisitPage>;
export const Default: Story = {};
