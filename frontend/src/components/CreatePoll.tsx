import { useState, useRef } from 'react';
import type { KeyboardEvent, ChangeEvent, DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreatePoll } from '../hooks/usePolls';
import { apiClient } from '../lib/api';
import type { PollOption } from '../types';

const MAX_OPTIONS = 4;
const MIN_OPTIONS = 2;
const MAX_TAGS = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface OptionWithImage {
  text: string;
  imageUrl: string | null;
  imageFile?: File;
  uploading?: boolean;
}

const CreatePoll = () => {
  const navigate = useNavigate();
  const { mutateAsync: createPoll, isPending } = useCreatePoll();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<OptionWithImage[]>([
    { text: '', imageUrl: null },
    { text: '', imageUrl: null },
  ]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const addOption = () => {
    if (options.length < MAX_OPTIONS) {
      setOptions([...options, { text: '', imageUrl: null }]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > MIN_OPTIONS) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOptionText = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = { ...updated[index], text: value };
    setOptions(updated);
  };

  const handleImageUpload = async (index: number, file: File) => {
    // Validate file
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setUploadError('JPEG, PNG, WebP, GIF만 허용됩니다');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setUploadError('파일 크기는 5MB 이하여야 합니다');
      return;
    }

    setUploadError(null);
    const updated = [...options];
    updated[index] = { ...updated[index], uploading: true, imageFile: file };
    setOptions(updated);

    try {
      const result = await apiClient.uploadImage(file);
      const updatedAfter = [...options];
      updatedAfter[index] = {
        ...updatedAfter[index],
        imageUrl: result.data.imageUrl,
        uploading: false,
        imageFile: undefined,
      };
      setOptions(updatedAfter);
    } catch (err) {
      const error = err as Error & { code?: string };
      setUploadError(error.message || '이미지 업로드에 실패했습니다');
      const updatedAfter = [...options];
      updatedAfter[index] = {
        ...updatedAfter[index],
        uploading: false,
        imageFile: undefined,
      };
      setOptions(updatedAfter);
    }
  };

  const handleFileChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(index, file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleDrop = (index: number, e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(index, file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const removeImage = (index: number) => {
    const updated = [...options];
    updated[index] = { ...updated[index], imageUrl: null, imageFile: undefined };
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

  const isUploading = options.some((opt) => opt.uploading);
  const isValid =
    question.trim().length >= 5 &&
    question.trim().length <= 200 &&
    options.every((opt) => opt.text.trim().length > 0) &&
    options.length >= MIN_OPTIONS &&
    !isUploading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isPending) return;

    try {
      const pollOptions: PollOption[] = options.map((opt) => ({
        text: opt.text.trim(),
        imageUrl: opt.imageUrl,
      }));

      const result = await createPoll({
        question: question.trim(),
        options: pollOptions,
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
            <div key={index} className="option-input-group">
              <div className="option-input">
                <input
                  type="text"
                  value={option.text}
                  onChange={(e) => updateOptionText(index, e.target.value)}
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

              {/* Image upload area */}
              <div
                className={`option-image-upload ${option.imageUrl ? 'has-image' : ''}`}
                onDrop={(e) => handleDrop(index, e)}
                onDragOver={handleDragOver}
              >
                {option.uploading ? (
                  <div className="image-uploading">
                    <span className="spinner" /> 업로드 중...
                  </div>
                ) : option.imageUrl ? (
                  <div className="image-preview">
                    <img src={option.imageUrl} alt={`옵션 ${index + 1} 이미지`} />
                    <button
                      type="button"
                      className="image-remove"
                      onClick={() => removeImage(index)}
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <div
                    className="image-dropzone"
                    onClick={() => fileInputRefs.current[index]?.click()}
                  >
                    <span className="dropzone-icon">📷</span>
                    <span className="dropzone-text">이미지 추가 (선택)</span>
                    <span className="dropzone-hint">클릭 또는 드래그앤드롭</span>
                  </div>
                )}
                <input
                  ref={(el) => { fileInputRefs.current[index] = el; }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => handleFileChange(index, e)}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          ))}
          {uploadError && <p className="upload-error">{uploadError}</p>}
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
          {isPending ? '등록 중...' : isUploading ? '업로드 중...' : '설문 등록'}
        </button>
      </form>
    </div>
  );
};

export default CreatePoll;
