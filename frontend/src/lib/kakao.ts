declare global {
  interface Window {
    Kakao: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Share: {
        sendDefault: (options: KakaoShareOptions) => void;
      };
    };
  }
}

interface KakaoShareOptions {
  objectType: 'feed';
  content: {
    title: string;
    description: string;
    imageUrl?: string;
    link: {
      mobileWebUrl: string;
      webUrl: string;
    };
  };
  buttons?: {
    title: string;
    link: {
      mobileWebUrl: string;
      webUrl: string;
    };
  }[];
}

let initialized = false;

export const initKakao = () => {
  const kakaoKey = import.meta.env.VITE_KAKAO_JS_KEY;

  if (!kakaoKey) {
    console.warn('VITE_KAKAO_JS_KEY is not set. Kakao sharing will not work.');
    return false;
  }

  if (typeof window.Kakao === 'undefined') {
    console.warn('Kakao SDK not loaded');
    return false;
  }

  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(kakaoKey);
    initialized = true;
  }

  return true;
};

export const shareToKakao = (question: string, pollId: string) => {
  if (!initialized && !initKakao()) {
    // Fallback to KakaoStory if SDK not available
    const shareUrl = `${window.location.origin}/poll/${pollId}`;
    window.open(`https://story.kakao.com/share?url=${encodeURIComponent(shareUrl)}`, '_blank');
    return;
  }

  const shareUrl = `${window.location.origin}/poll/${pollId}`;

  window.Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: question,
      description: 'VibePulse에서 투표에 참여해보세요!',
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
};
