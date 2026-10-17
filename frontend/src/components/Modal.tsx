import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function Modal({ title, description, children, onClose, busy = false, wide = false }: {
  title: string; description?: string; children: ReactNode; onClose: () => void; busy?: boolean; wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const dialog = ref.current!;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    dialog.querySelector<HTMLElement>('input,select,textarea')?.focus();
    return () => { dialog.close(); document.body.style.overflow = overflow; opener?.focus(); };
  }, []);
  return createPortal(<dialog ref={ref} className={`et-modal ${wide ? 'et-modal-wide' : ''}`} aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} aria-busy={busy}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={event => {
      if (event.target !== event.currentTarget || busy) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }}>
    <header className="et-modal-heading"><div><span className="et-eyebrow">EVERTRIP · TERMINAL</span><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div><button type="button" className="et-icon-button" disabled={busy} onClick={onClose} aria-label="Cerrar ventana"><X size={20}/></button></header>
    {children}
  </dialog>, document.body);
}
