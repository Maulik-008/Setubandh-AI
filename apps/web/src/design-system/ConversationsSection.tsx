import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { CATEGORY_BADGE_VARIANT, LineIcon } from '@setubandh/ui';
import { Inbox } from 'lucide-react';
import { useState } from 'react';
import { DemoSection } from './DemoSection';
import { CHANNELS, CONVERSATIONS, MODES, type ConversationRow } from './sample-data';

const STATES = ['data', 'loading', 'empty', 'error'] as const;
type TableState = (typeof STATES)[number];
const STATE_LABELS: Record<TableState, string> = {
  data: 'Data',
  loading: 'Loading',
  empty: 'Empty',
  error: 'Error',
};

const COLUMNS: TableColumn<ConversationRow>[] = [
  {
    key: 'contact',
    header: 'Contact',
    renderCell: (row) => (
      <span className="flex flex-col">
        <Text weight="medium">{row.contact}</Text>
        <span className="font-mono text-[11px] text-secondary">{row.phone}</span>
      </span>
    ),
  },
  {
    key: 'channel',
    header: 'Channel',
    renderCell: (row) => {
      const channel = CHANNELS.find(({ id }) => id === row.channel);
      return channel ? (
        <Badge variant={CATEGORY_BADGE_VARIANT[channel.hue]} label={channel.label} />
      ) : null;
    },
  },
  {
    key: 'mode',
    header: 'Mode',
    renderCell: (row) => (
      <Badge variant={CATEGORY_BADGE_VARIANT[MODES[row.mode].hue]} label={MODES[row.mode].label} />
    ),
  },
  {
    key: 'updated',
    header: 'Last message',
    align: 'end',
    renderCell: (row) => (
      <span className="font-mono text-xs text-secondary tabular-nums">{row.updated}</span>
    ),
  },
];

function isTableState(value: string): value is TableState {
  return (STATES as readonly string[]).includes(value);
}

/** Table with every state designed: data, a skeleton that mirrors the rows, empty and error with retry. */
export function ConversationsSection() {
  const [state, setState] = useState<TableState>('data');

  return (
    <DemoSection
      eyebrow="Table"
      title="Conversations, in every state"
      description="Switch the state to see the loading skeleton, the empty state and the error with a retry."
    >
      <div className="flex flex-col gap-4">
        <SegmentedControl
          label="Table state"
          size="sm"
          value={state}
          onChange={(value) => {
            if (isTableState(value)) setState(value);
          }}
        >
          {STATES.map((value) => (
            <SegmentedControlItem key={value} value={value} label={STATE_LABELS[value]} />
          ))}
        </SegmentedControl>

        {state === 'data' && (
          // Narrow screens scroll the table sideways instead of squeezing badges.
          <div
            role="region"
            aria-label="Conversations"
            tabIndex={0}
            className="-mx-1 overflow-x-auto overscroll-x-contain px-1"
          >
            <div className="min-w-[560px]">
              <Table data={CONVERSATIONS} columns={COLUMNS} idKey="id" hasHover />
            </div>
          </div>
        )}

        {state === 'loading' && (
          <div
            role="status"
            aria-busy="true"
            aria-label="Loading conversations"
            className="flex flex-col gap-3"
          >
            {CONVERSATIONS.map((row, index) => (
              <div key={row.id} className="flex items-center gap-4">
                <span className="flex flex-1 flex-col gap-1.5">
                  <Skeleton height={14} width="40%" index={index} />
                  <Skeleton height={10} width="25%" index={index} />
                </span>
                <Skeleton height={22} width={84} radius="rounded" index={index} />
                <Skeleton height={22} width={64} radius="rounded" index={index} />
                <Skeleton height={12} width={72} index={index} />
              </div>
            ))}
          </div>
        )}

        {state === 'empty' && (
          <Table
            data={[]}
            columns={COLUMNS}
            idKey="id"
            emptyState={
              <EmptyState
                icon={
                  <span className="grid size-12 place-items-center rounded-full bg-surface-3 text-2xl text-secondary">
                    <LineIcon icon={Inbox} />
                  </span>
                }
                title="No conversations yet"
                description="Connect a channel and new messages land here."
                actions={<Button label="Connect a channel" onClick={() => setState('data')} />}
              />
            }
          />
        )}

        {state === 'error' && (
          <Banner
            status="error"
            title="Conversations did not load."
            description="Check your connection, then try again."
            endContent={<Button label="Try again" size="sm" onClick={() => setState('data')} />}
          />
        )}
      </div>
    </DemoSection>
  );
}
