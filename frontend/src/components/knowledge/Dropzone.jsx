/**
 * Dropzone — accessible drag & drop + click-to-browse file input.
 * Purely presentational: calls onFiles(File[]) — the parent owns selection state.
 */
import { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Dropzone({
  onFiles, accept, multiple = false, disabled = false,
  icon: Icon = UploadCloud, title = 'Click to upload or drag & drop', subtitle, className,
}) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length) onFiles(files);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !disabled) { e.preventDefault(); inputRef.current?.click(); } }}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDrag(true); }}
      onDragLeave={(e) => { e.preventDefault(); setDrag(false); }}
      onDrop={(e) => { e.preventDefault(); setDrag(false); if (!disabled) handleFiles(e.dataTransfer.files); }}
      className={cn(
        'group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200',
        drag ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-secondary/50',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <div className={cn('mb-3 flex h-12 w-12 items-center justify-center rounded-xl transition-colors',
        drag ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground group-hover:text-primary')}>
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}

export default Dropzone;
