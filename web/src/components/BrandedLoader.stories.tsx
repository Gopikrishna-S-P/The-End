import type { Meta, StoryObj } from '@storybook/react-vite';
import BrandedLoader from './BrandedLoader';

const meta: Meta<typeof BrandedLoader> = {
  title: 'Components/BrandedLoader',
  component: BrandedLoader,
  args: { label: 'Loading', variant: 'inline', minHeight: 320 },
};
export default meta;

type Story = StoryObj<typeof BrandedLoader>;

export const Inline: Story = {};
export const Fullbleed: Story = { args: { variant: 'fullbleed' }, parameters: { layout: 'fullscreen' } };
