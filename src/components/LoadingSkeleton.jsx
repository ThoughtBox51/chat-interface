import './LoadingSkeleton.css'

export function SidebarSkeleton() {
  return (
    <div className="sidebar-skeleton">
      <div className="skeleton skeleton-header"></div>
      <div className="skeleton skeleton-new-chat"></div>
      <div className="skeleton skeleton-chat-item"></div>
      <div className="skeleton skeleton-chat-item"></div>
      <div className="skeleton skeleton-chat-item"></div>
      <div className="skeleton skeleton-chat-item"></div>
      <div className="skeleton skeleton-chat-item"></div>
      <div className="skeleton skeleton-footer"></div>
    </div>
  )
}

export function ChatWindowSkeleton() {
  return (
    <div className="chat-window-skeleton">
      <div className="skeleton skeleton-header"></div>
      <div className="skeleton-messages">
        <div className="skeleton-message user">
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-text"></div>
        </div>
        <div className="skeleton-message assistant">
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-text"></div>
        </div>
        <div className="skeleton-message user">
          <div className="skeleton skeleton-text"></div>
        </div>
        <div className="skeleton-message assistant">
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-text"></div>
        </div>
      </div>
      <div className="skeleton skeleton-input"></div>
    </div>
  )
}

export function LoadingSpinner() {
  return <span className="loading-spinner"></span>
}

export function LoadingOverlay() {
  return (
    <div className="loading-overlay">
      <div className="spinner-large"></div>
    </div>
  )
}
