from fastapi.middleware.cors import CORSMiddleware

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from scraper import login_heaven, get_today_diary_counts, get_today_diary_hourly_with_body_and_images as get_today_diary_hourly

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # セキュア化するなら["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],      # "POST", "GET", "OPTIONS", だけでもOK
    allow_headers=["*"],
)

class LoginRequest(BaseModel):
    heaven_id: str
    heaven_pass: str

class DiaryCountRequest(BaseModel):
    session_id: str
    shopdir: str
    extra_cookies: dict = None

class DiaryHourlyRequest(BaseModel):
    session_id: str
    shopdir: str
    from_date: str = None   # ← 追加
    to_date: str = None     # ← 追加
    extra_cookies: dict = None

@app.post("/api/heaven/login")
async def heaven_login_api(req: LoginRequest):
    login_res = login_heaven(req.heaven_id, req.heaven_pass)
    if login_res["ok"]:
        return {
            "ok": True,
            "session_id": str(login_res["session_id"]),
            "extra_cookies": login_res.get("extra_cookies", {})
        }
    else:
        raise HTTPException(status_code=401, detail=login_res.get("detail", "認証失敗・ID/PASS確認"))

@app.post("/api/heaven/diary_count")
async def heaven_diary_count(req: DiaryCountRequest):
    try:
        result = get_today_diary_counts(
            req.session_id, 
            req.shopdir, 
            extra_cookies=req.extra_cookies
        )
        if not isinstance(result, dict) or "total_today" not in result:
            raise Exception("日記取得に失敗")
        return {
            "ok": True,
            "total_today": result["total_today"],
            "by_cast": result["by_cast"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/heaven/diary_hourly")
async def heaven_diary_hourly(req: DiaryHourlyRequest):
    try:
        result = get_today_diary_hourly(
            req.session_id, 
            req.shopdir,
            from_date=req.from_date,   # ← 追加
            to_date=req.to_date,       # ← 追加
            extra_cookies=req.extra_cookies
        )
        print("APIレスポンス:", result)
        if not result.get("ok"):
            raise Exception(result.get("detail", "データ取得失敗"))
        return {
            "ok": True,
            "by_hour": result["by_hour"],
            "total_by_hour": result["total_by_hour"],
            "diaries": result.get("diaries", [])
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
