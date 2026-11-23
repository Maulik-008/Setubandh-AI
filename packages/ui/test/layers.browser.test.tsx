import { Button } from '@astryxdesign/core/Button';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppTheme } from '../src/color-mode/AppTheme';

/**
 * Acceptance (M1-05): Tailwind utilities override Astryx component defaults.
 * Astryx styles carry high specificity (`:not(#\#)` chains); only the cascade
 * layer order in globals.css lets a plain utility class win.
 */
describe('cascade layers (real Chromium, real globals.css)', () => {
  it('lets the theme style Astryx components: the primary button is a pill', () => {
    render(
      <AppTheme>
        <Button label="Save" variant="primary" />
      </AppTheme>,
    );
    expect(getComputedStyle(screen.getByRole('button', { name: 'Save' })).borderRadius).toBe(
      '9999px',
    );
  });

  it('lets Tailwind utilities on className override the component and theme defaults', () => {
    render(
      <AppTheme>
        <Button label="Save" variant="primary" className="rounded-none px-12" />
      </AppTheme>,
    );
    const style = getComputedStyle(screen.getByRole('button', { name: 'Save' }));
    expect(style.borderRadius).toBe('0px');
    expect(style.paddingInlineStart).toBe('48px');
    expect(style.paddingInlineEnd).toBe('48px');
  });

  it('generates the Paper & Pastel extra utilities (bg-cta) from the extras tokens', () => {
    render(
      <AppTheme>
        <p className="bg-cta text-cta-foreground">Ink</p>
        <Button label="Ink button" variant="primary" />
      </AppTheme>,
    );
    const utility = getComputedStyle(screen.getByText('Ink')).backgroundColor;
    const button = getComputedStyle(
      screen.getByRole('button', { name: 'Ink button' }),
    ).backgroundColor;
    expect(utility).not.toBe('rgba(0, 0, 0, 0)');
    expect(utility).toBe(button);
  });
});
