import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import SlashMenu from './SlashMenu';
import type { SlashMenuState } from '../hooks/useSlashMenu';

const items = [
  { id: '1', label: 'Assign to me', snippet: '/assign-me', category: 'Actions' },
  { id: '2', label: 'Create PTP', snippet: '/ptp', category: 'Actions' },
  { id: '3', label: 'Log visit', snippet: '/visit', category: 'Field' },
  { id: '4', label: 'Add note', snippet: '/note', category: 'General' },
];

function Interactive() {
  const [activeIndex, setActiveIndex] = useState(0);
  const state: SlashMenuState = {
    open: true,
    query: '',
    filteredItems: items,
    activeIndex,
    position: { left: 40, top: 40 },
    commit: () => {},
    commitId: () => {},
    close: () => {},
    move: () => {},
    setActiveIndex,
  };
  return <SlashMenu state={state} />;
}

const meta: Meta<typeof SlashMenu> = {
  title: 'Components/SlashMenu',
  component: SlashMenu,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof SlashMenu>;

export const Open: Story = { render: () => <Interactive /> };
