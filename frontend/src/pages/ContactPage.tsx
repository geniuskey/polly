import { useState } from 'react';

type ContactType = 'general' | 'bug' | 'feature' | 'report' | 'business';

const CONTACT_TYPES: { value: ContactType; label: string; description: string }[] = [
  { value: 'general', label: '일반 문의', description: '서비스 이용 관련 질문' },
  { value: 'bug', label: '버그 신고', description: '오류나 문제점 제보' },
  { value: 'feature', label: '기능 제안', description: '새로운 기능 아이디어' },
  { value: 'report', label: '신고', description: '부적절한 콘텐츠 신고' },
  { value: 'business', label: '제휴 문의', description: '비즈니스 협력 제안' },
];

const ContactPage = () => {
  const [contactType, setContactType] = useState<ContactType>('general');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // TODO: 실제 API 연동
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSubmitted(true);
    setIsSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="static-page contact-page">
        <div className="contact-success">
          <div className="success-icon">✓</div>
          <h1>문의가 접수되었습니다</h1>
          <p>
            보내주신 내용은 검토 후 입력하신 이메일로 답변드리겠습니다.
            <br />
            영업일 기준 1~3일 내에 답변을 받으실 수 있습니다.
          </p>
          <a href="/" className="back-home-btn">
            홈으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="static-page contact-page">
      <h1>문의하기</h1>
      <p className="contact-intro">
        VibePulse에 대한 의견이나 문의사항을 보내주세요.
        <br />
        소중한 피드백은 서비스 개선에 큰 도움이 됩니다.
      </p>

      <form className="contact-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>문의 유형</label>
          <div className="contact-type-grid">
            {CONTACT_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                className={`contact-type-btn ${contactType === type.value ? 'active' : ''}`}
                onClick={() => setContactType(type.value)}
              >
                <span className="type-label">{type.label}</span>
                <span className="type-desc">{type.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="email">이메일 *</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="답변 받으실 이메일 주소"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="subject">제목 *</label>
          <input
            type="text"
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="문의 제목을 입력해 주세요"
            required
            maxLength={100}
          />
        </div>

        <div className="form-group">
          <label htmlFor="message">내용 *</label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="문의 내용을 자세히 작성해 주세요"
            required
            rows={6}
            maxLength={2000}
          />
          <span className="char-count">{message.length}/2000</span>
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={isSubmitting || !email || !subject || !message}
        >
          {isSubmitting ? '전송 중...' : '문의 보내기'}
        </button>
      </form>

      <div className="contact-info">
        <h2>다른 연락 방법</h2>
        <ul>
          <li>
            <strong>이메일:</strong> support@vibepulse.com
          </li>
          <li>
            <strong>운영 시간:</strong> 평일 10:00 ~ 18:00 (공휴일 제외)
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ContactPage;
