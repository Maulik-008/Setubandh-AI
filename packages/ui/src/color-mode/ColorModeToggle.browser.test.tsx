import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { paperPastelTokens } from '../theme/tokens';
import { AppTheme } from './AppTheme';
import { ColorModeToggle } from './ColorModeToggle';

/** What the browser computes for a Paper & Pastel token, so tests compare like with like. */
function computed(channels: string): string {
  const probe = document.createElement('span');
  probe.style.color = `hsl(${channels})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function renderToggle() {
  return render(
    <AppTheme>
      <ColorModeToggle />
      <p>Paper</p>
    </AppTheme>,
  );
}

describe('<ColorModeToggle> in <AppTheme> (real Chromium)', () => {
  it('switches to dark mode by mouse through Astryx Theme', async () => {
    renderToggle();
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(getComputedStyle(screen.getByText('Paper')).color).toBe(
      computed(paperPastelTokens.dark.foreground),
    );
  });

  it('can be operated with the keyboard alone', async () => {
    renderToggle();
    await userEvent.click(screen.getByRole('radio', { name: 'Light' }));
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveFocus();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('remembers the choice for the next visit', async () => {
    const { unmount } = renderToggle();
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    unmount();
    renderToggle();
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
  });

  it('follows the operating system in system mode', async () => {
    renderToggle();
    await userEvent.click(screen.getByRole('radio', { name: 'Light' }));
    await userEvent.click(screen.getByRole('radio', { name: 'System' }));
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
    // Astryx removes data-theme in system mode; the page then follows prefers-color-scheme.
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    const os = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    expect(getComputedStyle(screen.getByText('Paper')).color).toBe(
      computed(paperPastelTokens[os].foreground),
    );
  });

  it('compact mode hides the words but keeps every option named for screen readers', async () => {
    render(
      <AppTheme>
        <ColorModeToggle isCompact />
      </AppTheme>,
    );
    for (const name of ['Light', 'Dark', 'System']) {
      const radio = screen.getByRole('radio', { name });
      expect(radio).toBeInTheDocument();
    }
    expect(screen.queryByText('Light')?.checkVisibility()).not.toBe(true);
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
  });
});
