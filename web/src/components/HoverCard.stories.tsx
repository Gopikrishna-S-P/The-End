import type { Meta, StoryObj } from '@storybook/react-vite';
import { HoverCard } from './HoverCard';

const meta: Meta<typeof HoverCard> = {
  title: 'Components/HoverCard',
  component: HoverCard,
};
export default meta;

type Story = StoryObj<typeof HoverCard>;

export const Default: Story = {
  render: () => (
    <HoverCard style={{ width: 280, padding: 20 }}>
      <strong>Case #4821</strong>
      <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-secondary)' }}>
        Hover cards lift slightly and gain a border highlight on hover.
      </p>
    </HoverCard>
  ),
};

export const Flat: Story = {
  render: () => (
    <HoverCard flat padded style={{ width: 280 }}>
      Flat variant — no shadow, just the border-highlight hover.
    </HoverCard>
  ),
};
