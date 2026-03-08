# pwdlib 적용 실행계획

## 요구사항 요약

**요구사항**: 백엔드 비밀번호 해싱을 `bcrypt` 직접 호출 방식에서 `pwdlib` 라이브러리 + bcrypt 알고리즘 조합으로 변경

**목적**: pwdlib은 비밀번호 해싱 알고리즘을 추상화한 라이브러리로, 알고리즘 교체와 유지보수를 더 쉽게 만들어준다.

## 현재상태 분석

- `backend/app/core/security.py`에서 `bcrypt` 패키지를 직접 import하여 `hashpw`, `checkpw`, `gensalt` 함수를 호출함
- `requirements.txt`에 `bcrypt`가 직접 의존성으로 등록되어 있음
- `hash_password`, `verify_password` 두 함수만 변경하면 호출부(auth.py, users.py 등)는 수정 불필요

## 구현 방법

- `pwdlib[bcrypt]` 패키지를 설치하고 `requirements.txt`에 추가
- `security.py`에서 `PasswordHash` 인스턴스를 생성하고 `hash_password`, `verify_password` 함수를 pwdlib API로 교체
- 기존 bcrypt로 저장된 해시값은 pwdlib도 bcrypt 알고리즘을 사용하므로 그대로 호환됨

## 구현 단계

### 1. requirements.txt에 pwdlib 추가 및 bcrypt 제거

```text
pwdlib[bcrypt]
```
- `bcrypt` 직접 의존성을 제거하고 `pwdlib[bcrypt]`로 교체 (pwdlib이 bcrypt를 내부 의존성으로 포함)

### 2. security.py — pwdlib PasswordHash 인스턴스 생성

```python
from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher

pwd_context = PasswordHash([BcryptHasher()])
```
- `PasswordHash`는 사용할 해싱 알고리즘 목록을 받아 인스턴스를 생성함
- `BcryptHasher()`를 전달해 bcrypt 알고리즘을 사용하도록 지정

### 3. security.py — hash_password, verify_password 함수 교체

```python
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```
- `pwd_context.hash()`는 내부적으로 bcrypt salt 생성 및 해싱을 수행하고 문자열을 반환
- `pwd_context.verify()`는 평문과 해시값을 비교해 bool을 반환
- 함수 시그니처가 동일하므로 호출부(auth.py, users.py, seed.py 등) 수정 불필요

### 4. Docker 컨테이너에서 의존성 재설치 및 확인

```bash
docker compose build fastapi
docker compose up -d fastapi
docker compose exec fastapi pytest
```
- 이미지를 재빌드해 pwdlib[bcrypt]가 설치되도록 함
- 테스트를 실행해 기존 hash/verify 동작이 유지되는지 확인

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/requirements.txt` | 수정 | `bcrypt` 제거, `pwdlib[bcrypt]` 추가 |
| `backend/app/core/security.py` | 수정 | bcrypt 직접 import 제거, pwdlib PasswordHash로 교체 |

## 완료 체크리스트

- [ ] `docker compose exec fastapi pytest` 전체 테스트 통과
- [ ] 로그인 API(`POST /api/v1/auth/login`)가 기존 저장된 bcrypt 해시로 정상 로그인되는지 확인
- [ ] 신규 회원가입 후 로그인이 정상 동작하는지 확인
- [ ] `docker compose exec fastapi pip show pwdlib`으로 패키지 설치 확인
- [ ] `security.py`에 `import bcrypt`가 남아있지 않은지 확인
