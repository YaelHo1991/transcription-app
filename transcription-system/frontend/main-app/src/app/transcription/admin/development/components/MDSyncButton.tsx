interface MDSyncButtonProps {
  onSync: () => void;
  isSyncing: boolean;
}

export default function MDSyncButton({ onSync, isSyncing }: MDSyncButtonProps) {
  return (
    <button
      className="md-sync-btn"
      onClick={onSync}
      disabled={isSyncing}
      title="ייצוא כל המשימות לקובץ todo-dev-hub.md"
    >
      {isSyncing ? (
        <>
          <span className="spinner-icon">⏳</span>
          <span>מסנכרן...</span>
        </>
      ) : (
        <>
          <span className="sync-icon">✅</span>
          <span>סיום / סנכרון ל-MD</span>
        </>
      )}
    </button>
  );
}