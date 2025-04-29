interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message?: string;
}

const LoginRequiredModal = ({
  isOpen,
  onClose,
  onConfirm,
  message = "이 기능은 로그인 후 이용할 수 있습니다.",
}: LoginRequiredModalProps) => {
  if (!isOpen) return null;
  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div
          className="auth-modal-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2>로그인 필요</h2>
          <button
            className="auth-close-button"
            onClick={onClose}
            style={{ fontSize: 20 }}
          >
            ✕
          </button>
        </div>
        <div style={{ margin: "24px 0", fontSize: 16, textAlign: "center" }}>
          {message}
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button className="submit-button" onClick={onConfirm}>
            로그인하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginRequiredModal;
