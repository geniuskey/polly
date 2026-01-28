import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreatePoll } from '../hooks/usePolls';

const MAX_OPTIONS = 4;
const MIN_OPTIONS = 2;

const CATEGORIES = [
  { id: 'politics', label: '정치' },
  { id: 'society', label: '사회' },
  { id: 'life', label: '라이프' },
  { id: 'food', label: '음식' },
  { id: 'entertainment', label: '연예' },
  { id: 'sports', label: '스포츠' },
  { id: 'tech', label: '기술' },
  { id: 'economy', label: '경제' },
  { id: 'fun', label: '재미' },
  { id: 'other', label: '기타' },
];

const CreatePoll = () => {
  const navigate = useNavigate();
  const { mutateAsync: createPoll, isPending } = useCreatePoll();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [category, setCategory] = useState('');

  const addOption = () => {
    if (options.length < MAX_OPTIONS) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > MIN_OPTIONS) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const isValid =
    question.trim().length >= 5 &&
    question.trim().length <= 200 &&
    options.every((opt) => opt.trim().length > 0) &&
    options.length >= MIN_OPTIONS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isPending) return;

    try {
      const result = await createPoll({
        question: question.trim(),
        options: options.map((opt) => opt.trim()),
        category: category || undefined,
      });
      navigate(`/poll/${result.data.id}`);
    } catch {
      alert('설문 등록에 실패했습니다.');
    }
  };

  return (
    <div className="create-poll">
      <h2>새 설문 만들기</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="question">질문</label>
          <input
            id="question"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="질문을 입력하세요 (5~200자)"
            maxLength={200}
          />
          <span className="char-count">{question.length}/200</span>
        </div>

        <div className="form-group">
          <label>옵션</label>
          {options.map((option, index) => (
            <div key={index} className="option-input">
              <input
                type="text"
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={`옵션 ${index + 1}`}
              />
              {options.length > MIN_OPTIONS && (
                <button
                  type="button"
                  className="remove-option"
                  onClick={() => removeOption(index)}
                >
                  삭제
                </button>
              )}
            </div>
          ))}
          {options.length < MAX_OPTIONS && (
            <button
              type="button"
              className="add-option"
              onClick={addOption}
            >
              + 옵션 추가
            </button>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="category">카테고리 (선택)</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">선택 안 함</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={!isValid || isPending}
        >
          {isPending ? '등록 중...' : '설문 등록'}
        </button>
      </form>
    </div>
  );
};

export default CreatePoll;
