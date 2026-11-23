import type { IconRegistry } from '@astryxdesign/core/Icon';
import { createElement, type ComponentType } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  Check,
  CheckCheck,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Columns,
  Copy,
  ExternalLink,
  EyeOff,
  Filter,
  Info,
  Menu,
  Mic,
  MoreHorizontal,
  Search,
  Square,
  Upload,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';

/** Paper & Pastel draws every Lucide icon at stroke 1.75 (requirements §13.3.1). */
export const ICON_STROKE_WIDTH = 1.75;

const props = { size: '1em', strokeWidth: ICON_STROKE_WIDTH, 'aria-hidden': true } as const;

// createElement, not JSX: `astryx theme build` loads this module with the classic JSX runtime.
const icon = (Glyph: ComponentType<typeof props>) => createElement(Glyph, props);

/**
 * The semantic icons Astryx components ask for (same names as the neutral theme),
 * drawn with Lucide at the Paper & Pastel stroke. Kept in its own module because
 * `astryx theme build` imports the registry instead of compiling it.
 */
export const paperPastelIcons: IconRegistry = {
  close: icon(X),
  chevronDown: icon(ChevronDown),
  chevronLeft: icon(ChevronLeft),
  chevronRight: icon(ChevronRight),
  chevronsLeft: icon(ChevronsLeft),
  chevronsRight: icon(ChevronsRight),
  check: icon(Check),
  success: icon(CheckCircle),
  error: icon(XCircle),
  warning: icon(AlertTriangle),
  info: icon(Info),
  calendar: icon(Calendar),
  clock: icon(Clock),
  externalLink: icon(ExternalLink),
  menu: icon(Menu),
  moreHorizontal: icon(MoreHorizontal),
  search: icon(Search),
  upload: icon(Upload),
  arrowUp: icon(ArrowUp),
  arrowDown: icon(ArrowDown),
  arrowsUpDown: icon(ArrowUpDown),
  funnel: icon(Filter),
  eyeSlash: icon(EyeOff),
  viewColumns: icon(Columns),
  copy: icon(Copy),
  checkDouble: icon(CheckCheck),
  wrench: icon(Wrench),
  stop: icon(Square),
  microphone: icon(Mic),
};
