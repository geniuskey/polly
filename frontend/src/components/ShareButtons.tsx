import { useState } from 'react';

interface ShareButtonsProps {
  pollId: string;
  question: string;
}

const ShareButtons = ({ pollId, question }: ShareButtonsProps) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/poll/${pollId}`;
  const shareText = `[VibePulse] ${question}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleKakaoShare = () => {
    const kakaoUrl = `https://sharer.kakao.com/talk/friends/picker/link?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(kakaoUrl, '_blank', 'width=500,height=600');
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=500,height=400');
  };

  return (
    <div className="share-buttons">
      <button className="share-btn copy" onClick={handleCopyLink}>
        {copied ? '복사됨!' : '링크 복사'}
      </button>
      <button className="share-btn kakao" onClick={handleKakaoShare}>
        카카오톡
      </button>
      <button className="share-btn twitter" onClick={handleTwitterShare}>
        X (트위터)
      </button>
    </div>
  );
};

export default ShareButtons;
