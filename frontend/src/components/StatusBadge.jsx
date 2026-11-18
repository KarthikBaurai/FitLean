const STYLES = {
  confirmed: 'bg-secondary-fixed text-on-secondary-fixed',
  completed: 'bg-surface-container-high text-on-surface',
  cancelled: 'bg-error-container text-on-error-container',
  new: 'bg-secondary-fixed text-on-secondary-fixed',
  contacted: 'bg-surface-container-high text-on-surface',
  closed: 'bg-surface-container text-outline',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`font-label-caps rounded-sm px-2 py-1 text-xs uppercase ${STYLES[status] || ''}`}>{status}</span>
  );
}
