# Frontend TDD 구조 생성 실행계획

## 요구사항 요약

**요구사항**: frontend(React)에 TDD(Test-Driven Development) 구조를 만든다.

**목적**: 앞으로 새로운 기능을 개발할 때 테스트를 먼저 작성하고 구현하는 TDD 방식을 적용하기 위한 기반 환경을 구축한다. 이미 만들어진 코드들은 TDD를 통과했다고 가정하므로, 기존 코드에 대한 테스트는 작성하지 않는다.

## 현재상태 분석

- 빌드 도구: Vite 7.3.0
- React 19.2.3, Material-UI 7.x, Axios, Matter.js 사용 중
- 테스트 프레임워크: 설치되어 있지 않음 (Jest, Vitest 모두 없음)
- 테스트 설정 파일: 없음 (vitest.config.js, jest.config.js 모두 없음)
- 테스트 파일: 없음 (*.test.js, *.spec.js 모두 없음)
- 컴포넌트: 총 17개 파일 (src/ 내 .jsx/.js)

## 구현 방법

**Vitest + React Testing Library** 조합을 사용한다.

- **Vitest**: Vite 기반 프로젝트의 표준 테스트 프레임워크. Vite의 설정과 플러그인을 그대로 공유하므로 별도의 Babel/Webpack 설정이 필요 없다. Jest 호환 API를 제공한다.
- **React Testing Library**: React 컴포넌트를 사용자 관점에서 테스트하는 라이브러리. 실제 사용자가 화면에서 보고 클릭하는 방식으로 테스트를 작성한다.
- **jsdom**: 브라우저 없이 DOM(HTML 요소)을 시뮬레이션하는 환경. 테스트에서 `document`, `window` 등 브라우저 객체를 사용할 수 있게 해준다.
- **@testing-library/user-event**: 사용자 입력(클릭, 타이핑 등)을 시뮬레이션하는 라이브러리.

## 구현 단계

### 1. 테스트 관련 패키지 설치

```bash
cd frontend
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```
- `vitest`: 테스트 실행기. 테스트 파일을 찾아서 실행하고 결과를 보여준다.
- `@testing-library/react`: React 컴포넌트를 렌더링하고 DOM 요소를 찾는 함수들을 제공한다. (`render`, `screen`)
- `@testing-library/jest-dom`: DOM 요소 전용 매처(matcher)를 추가한다. (`toBeInTheDocument()`, `toHaveTextContent()` 등)
- `@testing-library/user-event`: 사용자 행동(클릭, 타이핑)을 시뮬레이션한다.
- `jsdom`: 브라우저 없이 테스트할 수 있도록 가상 DOM 환경을 제공한다.

### 2. Vitest 설정 파일 생성

```javascript
// frontend/vitest.config.js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
});
```
- `environment: 'jsdom'`: 모든 테스트 파일에서 브라우저 DOM 환경을 사용한다.
- `globals: true`: `describe`, `it`, `expect` 등을 import 없이 바로 사용할 수 있게 한다.
- `setupFiles`: 모든 테스트 실행 전에 먼저 실행할 설정 파일을 지정한다.

### 3. 테스트 셋업 파일 생성

```javascript
// frontend/src/test/setup.js
import '@testing-library/jest-dom';
```
- `@testing-library/jest-dom`을 import하면 `toBeInTheDocument()`, `toBeVisible()` 같은 DOM 전용 매처가 모든 테스트 파일에서 자동으로 사용 가능해진다.
- 이 파일은 vitest.config.js의 `setupFiles`에 의해 모든 테스트 실행 전에 자동으로 실행된다.

### 4. package.json에 테스트 스크립트 추가

```json
{
  "scripts": {
    "start": "vite",
    "build": "vite build",
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui"
  }
}
```
- `npm test` 또는 `npm run test`: 테스트를 감시(watch) 모드로 실행한다. 파일을 수정하면 관련 테스트가 자동으로 다시 실행된다.
- `npm run test:run`: 테스트를 한 번만 실행하고 종료한다. CI/CD 환경에서 사용한다.
- `npm run test:ui`: 브라우저에서 테스트 결과를 시각적으로 확인할 수 있는 UI를 제공한다.

### 5. 샘플 테스트 파일 생성 (구조 검증용)

```javascript
// frontend/src/test/sample.test.jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('TDD 구조 검증', () => {
  it('테스트 환경이 정상적으로 작동한다', () => {
    render(<div>테스트 성공</div>);
    expect(screen.getByText('테스트 성공')).toBeInTheDocument();
  });
});
```
- TDD 구조가 올바르게 설정되었는지 확인하는 검증용 테스트이다.
- `render()`: JSX를 가상 DOM에 렌더링한다.
- `screen.getByText()`: 렌더링된 화면에서 텍스트로 요소를 찾는다.
- `toBeInTheDocument()`: 해당 요소가 DOM에 존재하는지 확인한다 (jest-dom 매처).

### 6. 테스트 실행으로 구조 검증

```bash
cd frontend
npm run test:run
```
- 설치한 패키지, 설정 파일, 샘플 테스트가 모두 정상적으로 연결되어 작동하는지 확인한다.
- `PASS` 결과가 나오면 TDD 구조가 올바르게 구축된 것이다.

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| frontend/package.json | 수정 | devDependencies에 테스트 패키지 추가, scripts에 test 명령어 추가 |
| frontend/vitest.config.js | 생성 | Vitest 설정 (jsdom 환경, globals, setupFiles) |
| frontend/src/test/setup.js | 생성 | jest-dom 매처 전역 등록 |
| frontend/src/test/sample.test.jsx | 생성 | 구조 검증용 샘플 테스트 |

## 완료 체크리스트

- [o] `npm run test:run` 실행 시 에러 없이 테스트가 통과한다
- [o] 샘플 테스트(sample.test.jsx)가 `PASS`로 표시된다
- [o] `npm test` 실행 시 watch 모드로 진입한다 (파일 변경 감지 대기 상태)
