import "./EmotionSelector.css";

type Emotion = "행복" | "슬픔" | "설렘" | "편안함" | "자신감" | null;

interface Props {
  selectedEmotion: Emotion;
  onSelectEmotion: (emotion: Emotion) => void;
}

const emotions = [
  { id: "행복", emoji: "😀", label: "행복" },
  { id: "슬픔", emoji: "😢", label: "슬픔" },
  { id: "설렘", emoji: "😍", label: "설렘" },
  { id: "편안함", emoji: "😌", label: "편안함" },
  { id: "자신감", emoji: "😎", label: "자신감" },
];

const EmotionSelector = ({ selectedEmotion, onSelectEmotion }: Props) => {
  return (
    <div className="emotion-selector">
      {emotions.map((emotion) => (
        <button
          key={emotion.id}
          className={`emotion-button ${
            selectedEmotion === emotion.id ? "selected" : ""
          }`}
          onClick={() => onSelectEmotion(emotion.id as Emotion)}
        >
          <span className="emotion-emoji">{emotion.emoji}</span>
          <span className="emotion-label">{emotion.label}</span>
        </button>
      ))}
    </div>
  );
};

export default EmotionSelector;
