'use client';

type Props = {
  notice: {
    tone: 'success' | 'error' | 'info';
    text: string;
  } | null;
};

export function FloatingNotice({ notice }: Props) {
  if (!notice?.text) {
    return null;
  }

  return (
    <div className="site-floating-notice-wrap" aria-live="polite">
      <div className={`site-floating-notice site-floating-notice--${notice.tone}`}>
        <span>{notice.text}</span>
      </div>
    </div>
  );
}
