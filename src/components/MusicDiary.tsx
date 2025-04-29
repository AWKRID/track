import { useState, FormEvent } from "react";
import "./MusicDiary.css";
import { useAuth } from "../contexts/useAuth";
import { supabase } from "../supabase";

type Emotion = "행복" | "슬픔" | "그리움" | "설렘" | "위로" | null;

const emotions = [
  { id: "행복", emoji: "😀", label: "행복" },
  { id: "슬픔", emoji: "😢", label: "슬픔" },
  { id: "그리움", emoji: "🥺", label: "그리움" },
  { id: "설렘", emoji: "😍", label: "설렘" },
  { id: "위로", emoji: "😌", label: "위로" },
];

interface DiaryFormData {
  musicLink: string;
  title: string;
  emotion: Emotion;
  content: string;
}

interface Props {
  onComplete: () => void;
}

const MusicDiary = ({ onComplete }: Props) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<DiaryFormData>({
    musicLink: "",
    title: "",
    emotion: null,
    content: "",
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [charactersLeft, setCharactersLeft] = useState<number>(500);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === "content") {
      // 남은 글자 수 계산
      setCharactersLeft(500 - value.length);
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleEmotionSelect = (emotion: Emotion) => {
    setFormData({
      ...formData,
      emotion,
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 필수 필드 검증
      if (!formData.musicLink || !formData.emotion || !formData.content) {
        alert("음악 링크, 감정, 내용을 모두 입력해주세요.");
        return;
      }

      // supabase에 데이터 저장
      const { error } = await supabase.from("diaries").insert([
        {
          user_id: user?.id,
          music_link: formData.musicLink,
          title: formData.title || null, // 제목은 선택사항
          emotion: formData.emotion,
          content: formData.content,
        },
      ]);

      if (error) throw error;

      // 성공 시
      alert("일기가 저장되었습니다!");
      onComplete();
    } catch (error) {
      console.error("일기 저장 중 오류 발생:", error);
      alert("일기 저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    formData.musicLink && formData.emotion && formData.content;

  return (
    <div className="diary-card">
      <div className="card-header">
        <h1>오늘의 음악 일기</h1>
        <p className="subheader">오늘 들은 음악으로 하루를 기록해보세요</p>
      </div>

      <form onSubmit={handleSubmit} className="diary-form">
        <div className="form-group">
          <label htmlFor="musicLink">오늘 들은 음악</label>
          <input
            id="musicLink"
            type="text"
            name="musicLink"
            value={formData.musicLink}
            onChange={handleInputChange}
            placeholder="Youtube 영상 링크를 붙여 넣으세요"
            required
            className="link-input"
          />
          <p className="input-hint">
            음악 링크를 붙여넣으면 자동으로 음악 정보를 가져옵니다
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="title">제목 (선택사항)</label>
          <input
            id="title"
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="일기의 제목을 입력하세요 (선택사항)"
            className="title-input"
          />
        </div>

        <div className="form-group">
          <label>오늘의 감정</label>
          <div className="emotion-selector">
            {emotions.map((emotion) => (
              <button
                type="button"
                key={emotion.id}
                className={`emotion-button ${
                  formData.emotion === emotion.id ? "selected" : ""
                }`}
                onClick={() => handleEmotionSelect(emotion.id as Emotion)}
              >
                <span className="emotion-emoji">{emotion.emoji}</span>
                <span className="emotion-label">{emotion.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="content">간단한 메모</label>
          <div className="textarea-container">
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              placeholder="이 노래를 들으며 느낀 감정이나 생각을 남겨보세요"
              maxLength={500}
              required
            />
            <div
              className={`char-counter ${charactersLeft < 40 ? "warning" : ""}`}
            >
              {charactersLeft}자 남음
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className={`post-button ${isFormValid ? "active" : "disabled"}`}
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? "저장 중..." : "일기 저장하기"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MusicDiary;
