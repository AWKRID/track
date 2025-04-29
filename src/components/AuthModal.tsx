import { useState } from "react";
import "./AuthModal.css";
import { useAuth } from "../contexts/useAuth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}

const AuthModal = ({
  isOpen,
  onClose,
  initialMode = "login",
}: AuthModalProps) => {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuth();

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null); // 입력할 때 에러 메시지 초기화
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        // 로그인 처리
        const { error } = await signIn(formData.email, formData.password);
        if (error) throw error;
        onClose(); // 성공 시 모달 닫기
      } else {
        // 회원가입 처리
        if (formData.password !== formData.confirmPassword) {
          throw new Error("비밀번호가 일치하지 않습니다.");
        }

        const { error } = await signUp(
          formData.email,
          formData.password,
          formData.username
        );
        if (error) throw error;

        // 회원가입 성공 메시지 표시하고 로그인 모드로 전환
        alert("회원가입이 완료되었습니다. 이메일 확인 후 로그인해 주세요.");
        setMode("login");
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || "오류가 발생했습니다. 다시 시도해 주세요.");
      } else {
        setError("오류가 발생했습니다. 다시 시도해 주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setError(null);
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <h2>{mode === "login" ? "로그인" : "회원가입"}</h2>
          <button className="auth-close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div className="form-group">
              <label htmlFor="username">사용자 이름</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="사용자 이름"
                required
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="이메일 주소"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="비밀번호"
              required
              disabled={loading}
            />
          </div>

          {mode === "signup" && (
            <div className="form-group">
              <label htmlFor="confirmPassword">비밀번호 확인</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="비밀번호 확인"
                required
                disabled={loading}
              />
            </div>
          )}

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {mode === "login"
              ? "계정이 없으신가요?"
              : "이미 계정이 있으신가요?"}
            <button
              className="switch-mode-button"
              onClick={toggleMode}
              disabled={loading}
            >
              {mode === "login" ? "회원가입" : "로그인"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
