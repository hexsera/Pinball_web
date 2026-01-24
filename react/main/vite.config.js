// Vite 설정 파일입니다
// Vite는 React 앱을 빠르게 실행하고 개발할 수 있게 도와주는 도구입니다

// Vite에서 필요한 함수를 가져옵니다
import { defineConfig } from 'vite';
// React를 사용하기 위한 Vite 플러그인을 가져옵니다
import react from '@vitejs/plugin-react';

// Vite 설정을 내보냅니다
export default defineConfig({
  // React 플러그인을 사용한다고 설정합니다
  // 이렇게 하면 Vite가 React 파일을 이해할 수 있습니다
  plugins: [react()],
});
