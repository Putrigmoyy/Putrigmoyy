'use client';

type Props = {
  visible: boolean;
  label?: string;
};

export function ActionLoadingOverlay({ visible, label }: Props) {
  if (!visible) {
    return null;
  }

  return (
    <div className="site-action-loading" aria-live="polite" aria-busy="true">
      <div className="site-action-loading__card">
        <img src="/loading-double-ring.svg" alt="" className="site-action-loading__image" />
        <span>{label || 'Memuat...'}</span>
      </div>
    </div>
  );
}
