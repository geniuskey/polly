const PollCardSkeleton = () => (
  <div className="poll-card skeleton-card">
    <div className="poll-card-header">
      <div className="skeleton skeleton-badge" />
      <div className="skeleton skeleton-text-sm" />
    </div>
    <div className="skeleton skeleton-title" />
    <div className="poll-options">
      <div className="skeleton skeleton-option" />
      <div className="skeleton skeleton-option" />
    </div>
  </div>
);

export const FeedSkeleton = () => (
  <div className="poll-list">
    <PollCardSkeleton />
    <PollCardSkeleton />
    <PollCardSkeleton />
  </div>
);

export const DetailSkeleton = () => (
  <div className="poll-detail">
    <div className="poll-card">
      <div className="poll-card-header">
        <div className="skeleton skeleton-badge" />
        <div className="skeleton skeleton-text-sm" />
      </div>
      <div className="skeleton skeleton-title" />
      <div className="poll-options">
        <div className="skeleton skeleton-option" />
        <div className="skeleton skeleton-option" />
        <div className="skeleton skeleton-option" />
      </div>
    </div>
    <div className="skeleton skeleton-results-block" />
  </div>
);
