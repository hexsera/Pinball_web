import sys
sys.path.insert(0, '/code')

from app.db.session import SessionLocal
from app.core.security import hash_password
from models import User

db = SessionLocal()
try:
    users = db.query(User).all()
    count = 0
    for user in users:
        if not user.password.startswith("$2b$"):
            user.password = hash_password(user.password)
            count += 1
    db.commit()
    print(f"완료: {count}명 재해싱, {len(users) - count}명 스킵")
finally:
    db.close()
