import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { ColorModeToggle } from './ColorModeToggle';

describe('<ColorModeToggle> (real Chromium)', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('switches to dark mode by mouse and applies it to the page', async () => {
    render(<ColorModeToggle />);
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('can be operated with the keyboard alone', async () => {
    render(<ColorModeToggle />);
    await userEvent.click(screen.getByRole('radio', { name: 'Light' }));
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveFocus();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('remembers the choice for the next visit', async () => {
    const { unmount } = render(<ColorModeToggle />);
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    unmount();
    render(<ColorModeToggle />);
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
  });
});
