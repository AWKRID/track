import "./DiaryNote.css";

interface Props {
  note: string;
  onChange: (note: string) => void;
  maxLength: number;
}

const DiaryNote = ({ note, onChange, maxLength }: Props) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      onChange(value);
    }
  };

  return (
    <div className="diary-note">
      <textarea
        placeholder="이 노래를 들으며 느낀 감정을 기록해보세요."
        value={note}
        onChange={handleChange}
        maxLength={maxLength}
      />
      <div className="char-counter">
        <span className={note.length > maxLength * 0.8 ? "near-limit" : ""}>
          {note.length}/{maxLength}자
        </span>
      </div>
    </div>
  );
};

export default DiaryNote;
