import { useState } from 'react';

interface ShareCardProps {
  pollId: string;
  question: string;
  selectedOption: string;
  percentage: number;
  totalVotes: number;
  onClose?: () => void;
}

const ShareCard = ({
  pollId,
  question,
  selectedOption,
  percentage,
  totalVotes,
  onClose,
}: ShareCardProps) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/poll/${pollId}`;
  const isMajority = percentage > 50;
  const positionText = isMajority
    ? `${percentage.toFixed(0)}% 다수파`
    : `${percentage.toFixed(0)}% 소수파`;

  const shareText = `"${question}" 투표에서 나는 ${positionText}! 당신은 어느 쪽? #VibePulse`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShareKakao = () => {
    if (window.Kakao?.Share) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: question,
          description: `나는 ${positionText}! 당신은?`,
          imageUrl: `${window.location.origin}/og-image.png`,
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
        buttons: [
          {
            title: '투표하기',
            link: {
              mobileWebUrl: shareUrl,
              webUrl: shareUrl,
            },
          },
        ],
      });
    } else {
      alert('카카오 공유 기능을 사용할 수 없습니다.');
    }
  };

  const handleShareTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  return (
    <div className="share-card">
      <button className="share-card-close" onClick={onClose} aria-label="닫기">
        ×
      </button>

      <div className="share-card-result">
        <div className={`position-badge ${isMajority ? 'majority' : 'minority'}`}>
          {isMajority ? '다수파' : '소수파'}
        </div>
        <p className="share-card-question">{question}</p>
        <div className="share-card-stat">
          <span className="stat-percentage">{percentage.toFixed(1)}%</span>
          <span className="stat-label">
            {totalVotes.toLocaleString()}명 중 당신과 같은 선택
          </span>
        </div>
        <p className="share-card-choice">
          내 선택: <strong>{selectedOption}</strong>
        </p>
      </div>

      <div className="share-card-actions">
        <button className="share-btn kakao" onClick={handleShareKakao}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.88 5.31 4.7 6.77l-.96 3.57c-.05.2.15.37.34.26L10.3 18.9c.54.07 1.1.1 1.7.1 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
          </svg>
          카카오톡
        </button>
        <button className="share-btn twitter" onClick={handleShareTwitter}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          X (Twitter)
        </button>
        <button
          className={`share-btn link ${copied ? 'copied' : ''}`}
          onClick={handleCopyLink}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          {copied ? '복사됨!' : '링크 복사'}
        </button>
      </div>
    </div>
  );
};

export default ShareCard;
