import * as React from 'react';
import { cn } from '../lib/cn';
import { Button } from './primitives';

/**
 * Drag-and-drop file upload.
 *
 * Used in exactly two places:
 *   1. Admin catalogue management — product photos (min 4). Admin only;
 *      suppliers have no photo upload route anywhere in the platform.
 *   2. Buyer return/support form — optional evidence photos.
 */

export interface UploadedFile {
  id: string;
  url: string;
  name: string;
  /** Present while the file is still being uploaded. */
  progress?: number;
  error?: string;
}

export interface FileUploadProps {
  id: string;
  label: string;
  hint?: string;
  value: UploadedFile[];
  onFilesSelected: (files: File[]) => void;
  onRemove: (id: string) => void;
  onReorder?: (ids: string[]) => void;
  accept?: string;
  maxFiles?: number;
  maxSizeMb?: number;
  minFiles?: number;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function FileUpload({
  id,
  label,
  hint,
  value,
  onFilesSelected,
  onRemove,
  onReorder,
  accept = 'image/jpeg,image/png,image/webp',
  maxFiles = 10,
  maxSizeMb = 8,
  minFiles,
  disabled,
  error,
  className,
}: FileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  const remaining = maxFiles - value.length;
  const shortfall = minFiles ? Math.max(0, minFiles - value.length) : 0;

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList);

    if (incoming.length > remaining) {
      setLocalError(`You can upload ${remaining} more ${remaining === 1 ? 'file' : 'files'}.`);
      return;
    }

    const acceptedTypes = accept.split(',').map((t) => t.trim());
    const tooBig = incoming.find((f) => f.size > maxSizeMb * 1024 * 1024);
    if (tooBig) {
      setLocalError(`"${tooBig.name}" is larger than ${maxSizeMb}MB.`);
      return;
    }
    const wrongType = incoming.find((f) => !acceptedTypes.includes(f.type));
    if (wrongType) {
      setLocalError(`"${wrongType.name}" is not a supported file type.`);
      return;
    }

    setLocalError(null);
    onFilesSelected(incoming);
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...value];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onReorder?.(next.map((f) => f.id));
  }

  const shownError = error ?? localError;

  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-900">
          {label}
          {minFiles && <span className="ml-0.5 text-red-600">*</span>}
        </label>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          'rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
          dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50/60',
          disabled && 'cursor-not-allowed opacity-60',
          shownError && 'border-red-400 bg-red-50',
        )}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          multiple={maxFiles > 1}
          accept={accept}
          disabled={disabled || remaining <= 0}
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = '';
          }}
          className="sr-only"
        />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="mx-auto h-8 w-8 text-slate-400"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
          />
        </svg>
        <p className="mt-2 text-sm text-slate-600">
          Drag files here, or{' '}
          <Button
            variant="ghost"
            size="sm"
            className="px-1 text-brand-700 underline"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || remaining <= 0}
          >
            browse
          </Button>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          JPG, PNG or WebP · up to {maxSizeMb}MB each · {remaining} of {maxFiles} remaining
        </p>
      </div>

      {shownError && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {shownError}
        </p>
      )}

      {shortfall > 0 && !shownError && (
        <p className="text-xs font-medium text-amber-700">
          {shortfall} more {shortfall === 1 ? 'photo is' : 'photos are'} required before this listing
          can be published.
        </p>
      )}

      {value.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {value.map((file, index) => (
            <li
              key={file.id}
              className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white"
            >
              <div className="aspect-square bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={file.url} alt={file.name} className="h-full w-full object-contain p-2" />
              </div>

              {index === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Main
                </span>
              )}

              {file.progress !== undefined && file.progress < 100 && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-200">
                  <div className="h-full bg-brand-600 transition-all" style={{ width: `${file.progress}%` }} />
                </div>
              )}

              {file.error && (
                <p className="bg-red-50 px-2 py-1 text-[10px] text-red-700">{file.error}</p>
              )}

              <div className="flex items-center justify-between border-t border-slate-100 px-1.5 py-1">
                {onReorder ? (
                  <span className="flex gap-0.5">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${file.name} earlier`}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                    >
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                        <path d="M10 13L5 8l5-5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === value.length - 1}
                      aria-label={`Move ${file.name} later`}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                    >
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                        <path d="M6 3l5 5-5 5z" />
                      </svg>
                    </button>
                  </span>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => onRemove(file.id)}
                  disabled={disabled}
                  aria-label={`Remove ${file.name}`}
                  className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M6.5 1h3a.5.5 0 01.5.5V2h3a.5.5 0 010 1h-.55l-.6 9.1A2 2 0 019.86 14H6.14a2 2 0 01-2-1.9L3.55 3H3a.5.5 0 010-1h3v-.5a.5.5 0 01.5-.5z" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
