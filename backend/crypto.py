from cryptography.fernet import Fernet
import os

# 本番は.envで鍵を安全に管理
SECRET_KEY = os.getenv("ENCRYPT_KEY", Fernet.generate_key())
cipher = Fernet(SECRET_KEY)

def encrypt(text):
    return cipher.encrypt(text.encode()).decode()

def decrypt(token):
    return cipher.decrypt(token.encode()).decode()
