import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreatePoll } from '../hooks/usePolls';

const MAX_OPTIONS = 4;
const MIN_OPTIONS = 2;
const MAX_TAGS = 5;

const CreatePoll = () => {
  const navigate = useNavigate();
  const { mutateAsync: createPoll, isPending } = useCreatePoll();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

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

  const addTag = (tag: string) => {
    const cleaned = tag.trim().toLowerCase().replace(/^#/, '');
    if (cleaned && cleaned.length <= 20 && tags.length < MAX_TAGS && !tags.includes(cleaned)) {
      setTags([...tags, cleaned]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
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
        tags: tags.length > 0 ? tags : undefined,
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
          <label htmlFor="tags">태그 (선택, 최대 5개)</label>
          <div className="tag-input-wrapper">
            {tags.map((tag) => (
              <span key={tag} className="tag-chip">
                #{tag}
                <button
                  type="button"
                  className="tag-remove"
                  onClick={() => removeTag(tag)}
                >
                  &times;
                </button>
              </span>
            ))}
            {tags.length < MAX_TAGS && (
              <input
                id="tags"
                type="text"
                className="tag-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => tagInput && addTag(tagInput)}
                placeholder={tags.length === 0 ? '태그 입력 (Enter로 추가)' : ''}
              />
            )}
          </div>
          <span className="tag-hint">스페이스 또는 Enter로 태그 추가</span>
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
