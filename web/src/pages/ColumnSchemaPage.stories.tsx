import type { Meta, StoryObj } from '@storybook/react-vite';
import ColumnSchemaPage from './ColumnSchemaPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof ColumnSchemaPage> = {
  title: 'Pages/Uploads/ColumnSchemaPage',
  component: ColumnSchemaPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof ColumnSchemaPage>;
export const Default: Story = {};
