"""Router de autenticação — login JWT + CRUD de usuários."""

from datetime import datetime, timedelta, timezone
from hashlib import sha256

from fastapi import APIRouter, HTTPException, Header
from jose import JWTError, jwt

from ..services.settings_file import load_users, save_users

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 dias

router = APIRouter(prefix="/auth", tags=["auth"])

_secret_key = None


def _get_secret() -> str:
    global _secret_key
    if _secret_key:
        return _secret_key
    from ..services.settings_file import load_settings
    settings = load_settings()
    key = getattr(settings, "auth_token", None)
    if not key:
        from ..config import THINGIVERSE_APP_TOKEN
        key = THINGIVERSE_APP_TOKEN or "storker-dev-secret"
    _secret_key = key
    return key


def _hash_password(password: str) -> str:
    return sha256(password.encode()).hexdigest()


def _get_users() -> dict:
    users = load_users()
    if not users:
        return {"admin": {"password_hash": _hash_password("admin"), "role": "admin"}}
    result = {}
    for username, raw in users.items():
        if isinstance(raw, str) and raw.startswith("{"):
            import json
            try:
                result[username] = json.loads(raw)
            except json.JSONDecodeError:
                result[username] = {"password_hash": raw, "role": "user"}
        elif isinstance(raw, str):
            result[username] = {"password_hash": raw, "role": "user"}
        else:
            result[username] = raw
    return result


def _save_user_dict(users: dict) -> None:
    import json
    flat = {}
    for username, data in users.items():
        flat[username] = json.dumps(data) if isinstance(data, dict) else data
    save_users(flat)


@router.post("/login")
async def login(username: str, password: str):
    users = _get_users()
    user_data = users.get(username)
    if not user_data or user_data.get("password_hash") != _hash_password(password):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = jwt.encode({"sub": username, "exp": expire}, _get_secret(), algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer", "username": username, "role": user_data.get("role", "user")}


@router.get("/me")
async def me(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token não fornecido")
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, _get_secret(), algorithms=[ALGORITHM])
        return {"username": payload.get("sub")}
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")


@router.get("/users")
async def list_users(authorization: str = Header(None)):
    users = _get_users()
    return [{"username": u, "role": d.get("role", "user")} for u, d in users.items()]


@router.post("/users")
async def create_user(username: str, password: str, role: str = "user", authorization: str = Header(None)):
    if not username or not password:
        raise HTTPException(status_code=400, detail="Usuário e senha obrigatórios")
    users = _get_users()
    if username in users:
        raise HTTPException(status_code=409, detail="Usuário já existe")
    users[username] = {"password_hash": _hash_password(password), "role": role}
    _save_user_dict(users)
    return {"detail": f"Usuário {username} criado", "username": username, "role": role}


@router.patch("/users/{username}")
async def update_user(username: str, password: str = None, role: str = None, authorization: str = Header(None)):
    users = _get_users()
    if username not in users:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if password:
        users[username]["password_hash"] = _hash_password(password)
    if role:
        users[username]["role"] = role
    _save_user_dict(users)
    return {"detail": f"Usuário {username} atualizado"}


@router.delete("/users/{username}")
async def delete_user(username: str, authorization: str = Header(None)):
    if username == "admin":
        raise HTTPException(status_code=400, detail="Não é possível remover o usuário admin")
    users = _get_users()
    if username not in users:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    del users[username]
    _save_user_dict(users)
    return {"detail": f"Usuário {username} removido"}


def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token não fornecido")
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, _get_secret(), algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")
