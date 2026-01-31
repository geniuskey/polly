import { useState, useRef, useCallback, type ReactNode } from 'react';

interface SwipeableCardStackProps {
  children: ReactNode[];
  onSwipeLeft?: (index: number) => void;
  onSwipeRight?: (index: number) => void;
  onIndexChange?: (index: number) => void;
}

const SWIPE_THRESHOLD = 80; // Minimum distance to trigger swipe
const SWIPE_VELOCITY_THRESHOLD = 0.3; // Minimum velocity to trigger swipe

const SwipeableCardStack = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onIndexChange,
}: SwipeableCardStackProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startTimeRef = useRef(0);
  const currentXRef = useRef(0);

  const cards = Array.isArray(children) ? children : [children];
  const totalCards = cards.length;

  const goToIndex = useCallback(
    (newIndex: number, direction?: 'left' | 'right') => {
      if (newIndex < 0 || newIndex >= totalCards || isAnimating) return;

      setIsAnimating(true);

      // Trigger callbacks
      if (direction === 'left' && onSwipeLeft) {
        onSwipeLeft(currentIndex);
      } else if (direction === 'right' && onSwipeRight) {
        onSwipeRight(currentIndex);
      }

      setCurrentIndex(newIndex);
      onIndexChange?.(newIndex);

      setTimeout(() => {
        setIsAnimating(false);
        setDragOffset(0);
      }, 300);
    },
    [currentIndex, totalCards, isAnimating, onSwipeLeft, onSwipeRight, onIndexChange]
  );

  const handleDragStart = useCallback(
    (clientX: number) => {
      if (isAnimating) return;
      setIsDragging(true);
      startXRef.current = clientX;
      currentXRef.current = clientX;
      startTimeRef.current = Date.now();
    },
    [isAnimating]
  );

  const handleDragMove = useCallback(
    (clientX: number) => {
      if (!isDragging) return;

      currentXRef.current = clientX;
      const diff = clientX - startXRef.current;

      // Apply resistance at edges
      if (
        (currentIndex === 0 && diff > 0) ||
        (currentIndex === totalCards - 1 && diff < 0)
      ) {
        setDragOffset(diff * 0.3); // Resistance effect
      } else {
        setDragOffset(diff);
      }
    },
    [isDragging, currentIndex, totalCards]
  );

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const diff = currentXRef.current - startXRef.current;
    const timeDiff = Date.now() - startTimeRef.current;
    const velocity = Math.abs(diff) / timeDiff;

    const shouldSwipe =
      Math.abs(diff) > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD;

    if (shouldSwipe) {
      if (diff > 0 && currentIndex > 0) {
        goToIndex(currentIndex - 1, 'right');
      } else if (diff < 0 && currentIndex < totalCards - 1) {
        goToIndex(currentIndex + 1, 'left');
      } else {
        setDragOffset(0);
      }
    } else {
      setDragOffset(0);
    }
  }, [isDragging, currentIndex, totalCards, goToIndex]);

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleDragEnd();
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && currentIndex > 0) {
      goToIndex(currentIndex - 1, 'right');
    } else if (e.key === 'ArrowRight' && currentIndex < totalCards - 1) {
      goToIndex(currentIndex + 1, 'left');
    }
  };

  return (
    <div className="swipeable-stack-container">
      {/* Progress indicator */}
      <div className="swipe-progress">
        <span className="swipe-progress-text">
          {currentIndex + 1} / {totalCards}
        </span>
        <div className="swipe-progress-bar">
          <div
            className="swipe-progress-fill"
            style={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
          />
        </div>
      </div>

      {/* Card stack */}
      <div
        ref={containerRef}
        className="swipeable-stack"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label="스와이프 가능한 설문 카드"
      >
        <div
          className="swipeable-track"
          style={{
            transform: `translateX(calc(-${currentIndex * 100}% + ${dragOffset}px))`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          }}
        >
          {cards.map((card, index) => (
            <div
              key={index}
              className={`swipeable-card ${index === currentIndex ? 'active' : ''}`}
              style={{
                opacity: Math.abs(index - currentIndex) <= 1 ? 1 : 0,
              }}
            >
              {card}
            </div>
          ))}
        </div>

        {/* Swipe hint overlay */}
        {isDragging && (
          <div
            className={`swipe-hint ${dragOffset > 30 ? 'hint-right' : ''} ${dragOffset < -30 ? 'hint-left' : ''}`}
          >
            {dragOffset > 30 && currentIndex > 0 && (
              <span className="swipe-hint-text">← 이전</span>
            )}
            {dragOffset < -30 && currentIndex < totalCards - 1 && (
              <span className="swipe-hint-text">다음 →</span>
            )}
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="swipe-nav">
        <button
          className="swipe-nav-btn prev"
          onClick={() => goToIndex(currentIndex - 1, 'right')}
          disabled={currentIndex === 0 || isAnimating}
          aria-label="이전 설문"
        >
          ←
        </button>
        <button
          className="swipe-nav-btn next"
          onClick={() => goToIndex(currentIndex + 1, 'left')}
          disabled={currentIndex === totalCards - 1 || isAnimating}
          aria-label="다음 설문"
        >
          →
        </button>
      </div>
    </div>
  );
};

export default SwipeableCardStack;
