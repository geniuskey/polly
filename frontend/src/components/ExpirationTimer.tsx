import { useState, useEffect } from 'react';

interface ExpirationTimerProps {
  expiresAt: string;
}

const formatTimeRemaining = (ms: number): string => {
  if (ms <= 0) return '마감됨';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}일 ${hours % 24}시간 남음`;
  }
  if (hours > 0) {
    return `${hours}시간 ${minutes % 60}분 남음`;
  }
  if (minutes > 0) {
    return `${minutes}분 ${seconds % 60}초 남음`;
  }
  return `${seconds}초 남음`;
};

const ExpirationTimer = ({ expiresAt }: ExpirationTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(() => {
    return new Date(expiresAt).getTime() - Date.now();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = new Date(expiresAt).getTime() - Date.now();
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const isUrgent = timeRemaining > 0 && timeRemaining < 1000 * 60 * 60; // Less than 1 hour

  return (
    <div className={`poll-timer ${isUrgent ? 'urgent' : ''}`}>
      <span className="poll-timer-icon">⏱️</span>
      <span>{formatTimeRemaining(timeRemaining)}</span>
    </div>
  );
};

export default ExpirationTimer;
