// Phase 1 마이그레이션: 실제 구현은 contexts/AuthContext.jsx로 이동
// 기존 import 경로 호환성 유지용 브릿지 파일
export { AuthProvider, useAuth } from './contexts/AuthContext';
