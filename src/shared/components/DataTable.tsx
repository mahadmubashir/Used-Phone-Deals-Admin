import * as React from 'react';
import { cn } from '../lib/cn';
import { LoadingState, EmptyState, ErrorState, Pagination } from './primitives';

/**
 * Reusable sortable / filterable table used across every admin, CSR and
 * supplier list view. Sorting and pagination can be driven locally (small
 * fixture sets) or lifted to the server by supplying the controlled props.
 */

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  /** Cell renderer. Falls back to the raw value at `key`. */
  render?: (row: T) => React.ReactNode;
  /** Value used for local sorting — omit to make the column unsortable. */
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'right' | 'center';
  width?: string;
  /** Hidden below `md` — keeps dense tables usable on tablets. */
  hideOnMobile?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  caption?: string;
  /** Controlled sorting — omit for local sorting. */
  sort?: { key: string; direction: 'asc' | 'desc' } | null;
  onSortChange?: (sort: { key: string; direction: 'asc' | 'desc' }) => void;
  /** Controlled pagination — omit to render all rows. */
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  toolbar?: React.ReactNode;
  className?: string;
  dense?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  onRetry,
  onRowClick,
  emptyTitle = 'Nothing to show',
  emptyDescription,
  emptyAction,
  caption,
  sort,
  onSortChange,
  page,
  totalPages,
  onPageChange,
  toolbar,
  className,
  dense,
}: DataTableProps<T>) {
  const [localSort, setLocalSort] = React.useState<{ key: string; direction: 'asc' | 'desc' } | null>(
    null,
  );

  const controlled = sort !== undefined;
  const activeSort = controlled ? sort : localSort;

  const sortedRows = React.useMemo(() => {
    if (controlled || !localSort) return rows;
    const column = columns.find((c) => c.key === localSort.key);
    if (!column?.sortValue) return rows;
    const factor = localSort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      if (av === bv) return 0;
      return av > bv ? factor : -factor;
    });
  }, [rows, columns, localSort, controlled]);

  function toggleSort(column: Column<T>) {
    if (!column.sortValue && !onSortChange) return;
    const direction: 'asc' | 'desc' =
      activeSort?.key === column.key && activeSort.direction === 'asc' ? 'desc' : 'asc';
    const next = { key: column.key, direction };
    if (controlled) onSortChange?.(next);
    else setLocalSort(next);
  }

  const body = (() => {
    if (loading) return <LoadingState label="Loading…" />;
    if (error) return <ErrorState message={error} onRetry={onRetry} />;
    if (sortedRows.length === 0) {
      return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
    }
    return null;
  })();

  return (
    <div className={cn('overflow-hidden rounded-xl border border-slate-200 bg-white', className)}>
      {toolbar && (
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50/60 px-4 py-3">
          {toolbar}
        </div>
      )}

      {body ? (
        <div className="p-4">{body}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            {caption && <caption className="sr-only">{caption}</caption>}
            <thead className="border-b border-slate-200 bg-slate-50/60">
              <tr>
                {columns.map((column) => {
                  const sortable = Boolean(column.sortValue) || Boolean(onSortChange);
                  const isActive = activeSort?.key === column.key;
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      style={column.width ? { width: column.width } : undefined}
                      aria-sort={
                        isActive ? (activeSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
                      }
                      className={cn(
                        'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600',
                        column.align === 'right' && 'text-right',
                        column.align === 'center' && 'text-center',
                        column.hideOnMobile && 'hidden md:table-cell',
                      )}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(column)}
                          className="inline-flex items-center gap-1 hover:text-slate-900"
                        >
                          {column.header}
                          <SortIcon active={isActive} direction={activeSort?.direction} />
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === 'Enter') onRowClick(row);
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  className={cn(
                    onRowClick &&
                      'cursor-pointer transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600',
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-4 align-middle text-slate-700',
                        dense ? 'py-2.5' : 'py-3.5',
                        column.align === 'right' && 'text-right',
                        column.align === 'center' && 'text-center',
                        column.hideOnMobile && 'hidden md:table-cell',
                        column.className,
                      )}
                    >
                      {column.render
                        ? column.render(row)
                        : String((row as Record<string, unknown>)[column.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {page !== undefined && totalPages !== undefined && onPageChange && totalPages > 1 && (
        <div className="border-t border-slate-200 px-4 py-3">
          <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  );
}

function SortIcon({ active, direction }: { active: boolean; direction?: 'asc' | 'desc' }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn('h-3 w-3', active ? 'text-brand-600' : 'text-slate-400')}
      fill="currentColor"
      aria-hidden="true"
    >
      {(!active || direction === 'asc') && <path d="M8 3l3.5 4h-7L8 3z" />}
      {(!active || direction === 'desc') && <path d="M8 13l-3.5-4h7L8 13z" />}
    </svg>
  );
}
