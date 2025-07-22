import requests
from bs4 import BeautifulSoup
from collections import defaultdict, Counter
import datetime
import html

def login_heaven(heaven_id, heaven_pass):
    login_url = "https://newmanager.cityheaven.net/C1Login.php?from=CHAdminAuth"
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': login_url
    })
    payload = {
        "txt_account": heaven_id,
        "txt_password": heaven_pass,
        "login": "ログイン",
        "chk_save": "",
    }
    try:
        res = session.post(login_url, data=payload, timeout=15)
        print("=== LOGIN POST DEBUG ===")
        print("STATUS:", res.status_code)
        print("URL:", res.url)
        print("HTML PREVIEW:", res.text[:1000])
        print("========================")
    except Exception as e:
        return {"ok": False, "detail": f"接続エラー: {e}"}

    if res.ok and "C1Main.php" in res.url:
        print("ログイン成功")
        session_id = session.cookies.get("PHPSESSID", "")
        extra_cookies = {c.name: c.value for c in session.cookies if c.name != "PHPSESSID"}
        if session_id:
            return {
                "ok": True,
                "session_id": session_id,
                "extra_cookies": extra_cookies
            }
        else:
            return {"ok": False, "detail": "session_id取得失敗", "url": res.url}
    elif "IDまたはパスワードが違います" in res.text or "エラー" in res.text or "ログイン" in res.text:
        print("ログイン失敗:IDまたはパスワード不一致・または画面変化なし")
        return {"ok": False, "detail": "IDまたはパスワードが間違っています", "url": res.url}
    elif "<html" in res.text:
        print("ログイン失敗:HTMLのみ返却")
        return {"ok": False, "detail": "HTMLエラー/認証失敗", "url": res.url, "html": res.text[:800]}
    else:
        print("ログイン失敗:その他")
        return {"ok": False, "detail": "認証失敗またはサイト構造変更", "url": res.url, "html": res.text[:800]}

def make_logged_in_session(session_id, extra_cookies=None):
    session = requests.Session()
    session.cookies.set("PHPSESSID", session_id, domain=".cityheaven.net")
    if extra_cookies:
        for key, value in extra_cookies.items():
            session.cookies.set(key, value, domain=".cityheaven.net")
    session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    return session

def prepare_diary_list_page(session, shopdir):
    session.get(f"https://newmanager.cityheaven.net/C1Main.php?shopdir={shopdir}", timeout=10)
    session.get(f"https://newmanager.cityheaven.net/C2GirlList.php?shopdir={shopdir}", timeout=10)
    session.get(f"https://newmanager.cityheaven.net/C2GirlList.php?shopdir={shopdir}", timeout=10)

# --- 既存のまま（本数カウントだけ） ---
def get_today_diary_counts(session_id, shopdir, extra_cookies=None):
    today = datetime.datetime.now().strftime("%m月%d日")
    cast_counter = Counter()
    total_today = 0
    start = 1

    session = make_logged_in_session(session_id, extra_cookies)
    prepare_diary_list_page(session, shopdir)

    while True:
        url = f"https://newmanager.cityheaven.net/C8KeitaiDiaryList.php?shopdir={shopdir}"
        if start > 1:
            url += f"&start={start}"
        res = session.get(url, timeout=15)
        res.encoding = "utf-8"
        soup = BeautifulSoup(res.text, "html.parser")
        tables = soup.find_all("table")
        if len(tables) < 2:
            break
        target_table = tables[1]
        tbody = target_table.find("tbody")
        if not tbody:
            break
        diary_rows = tbody.find_all("tr")
        found_today = False
        any_data = False
        for tr in diary_rows:
            tds = tr.find_all(["td", "th"])
            if len(tds) < 3:
                continue
            date_text = tds[1].get_text(strip=True)
            cast_name = tds[2].get_text(strip=True)
            if today in date_text:
                found_today = True
                total_today += 1
                cast_counter[cast_name] += 1
                any_data = True
        if not any_data or not found_today or len(diary_rows) < 30:
            break
        start += 1
    return {
        "ok": True,
        "total_today": total_today,
        "by_cast": dict(cast_counter)
    }

# --- 本文取得付き：編集ページHTML仕様に完全対応 ---
def get_today_diary_hourly_with_body_and_images(session_id, shopdir, from_date=None, to_date=None, extra_cookies=None):
    """
    指定日の全キャスト日記を本文・タイトル・写メ画像URL付きで取得
    """
    # 日付範囲のセットアップ
    if from_date and to_date:
        dt_from = datetime.datetime.strptime(from_date, "%Y-%m-%d")
        dt_to = datetime.datetime.strptime(to_date, "%Y-%m-%d")
        date_set = set(
            (dt_from + datetime.timedelta(days=i)).strftime("%m月%d日")
            for i in range((dt_to - dt_from).days + 1)
        )
    else:
        today = datetime.datetime.now().strftime("%m月%d日")
        date_set = {today}

    by_hour = defaultdict(lambda: defaultdict(int))
    total_by_hour = defaultdict(int)
    diaries = []
    start = 1

    session = make_logged_in_session(session_id, extra_cookies)
    prepare_diary_list_page(session, shopdir)

    while True:
        url = f"https://newmanager.cityheaven.net/C8KeitaiDiaryList.php?shopdir={shopdir}"
        if start > 1:
            url += f"&start={start}"
        res = session.get(url, timeout=15)
        res.encoding = "utf-8"
        soup = BeautifulSoup(res.text, "html.parser")
        tables = soup.find_all("table")
        if len(tables) < 2:
            break
        target_table = tables[1]
        tbody = target_table.find("tbody")
        if not tbody:
            break
        diary_rows = tbody.find_all("tr")
        found_any = False
        any_data = False
        for tr in diary_rows:
            tds = tr.find_all(["td", "th"])
            if len(tds) < 6:
                continue
            date_text = tds[1].get_text(strip=True)
            cast_name = tds[2].get_text(strip=True)
            # 日付範囲にマッチ
            if any(d in date_text for d in date_set):
                found_any = True
                try:
                    sp = date_text.split()
                    hour = None
                    if len(sp) >= 2:
                        hour_part = sp[1]
                        hour = int(hour_part.split(":")[0])
                    diary_td = tds[4]
                    p_tag = diary_td.find("p")
                    title = p_tag.get_text(strip=True) if p_tag else None
                    body_preview = diary_td.get_text(separator="\n", strip=True)
                    edit_td = tds[5]
                    a_tag = edit_td.find("a", href=True)
                    diary_url = None
                    body_full = None
                    main_image_url = None
                    image_urls = []
                    if a_tag:
                        href = a_tag['href']
                        if href.startswith("./"):
                            href = href[2:]
                        diary_url = "https://newmanager.cityheaven.net/" + href
                        try:
                            detail_res = session.get(diary_url, timeout=10)
                            detail_res.encoding = "utf-8"
                            detail_soup = BeautifulSoup(detail_res.text, "html.parser")
                            textarea = detail_soup.find("textarea", {"name": "body"})
                            if textarea:
                                body_full = textarea.string
                                if body_full is None:
                                    body_full = textarea.get_text()
                                body_full = html.unescape(body_full)
                            else:
                                body_full = None

                            # --- 写メ・画像取得 ---
                            for img in detail_soup.find_all("img"):
                                src = img.get("src", "")
                                # 写メ画像（1枚だけmainとして取得）
                                if (not main_image_url) and "/img/girls/" in src:
                                    if src.startswith("/"):
                                        src = "https://newmanager.cityheaven.net" + src
                                    main_image_url = src
                                # サブ画像（decoも含め全部リスト化）
                                if "/img/girls/" in src or "/img/deco/" in src:
                                    if src.startswith("/"):
                                        src = "https://newmanager.cityheaven.net" + src
                                    image_urls.append(src)
                        except Exception as ex:
                            print("詳細ページ取得エラー:", ex)
                            body_full = None
                            main_image_url = None
                            image_urls = []
                    diaries.append({
                        "date": date_text,
                        "cast": cast_name,
                        "hour": hour,
                        "title": title,
                        "body_preview": body_preview,
                        "diary_url": diary_url,
                        "body": body_full,
                        "main_image_url": main_image_url,  # 写メ画像(1枚)
                        "image_urls": image_urls           # すべての画像(リスト)
                    })
                    if hour is not None:
                        by_hour[cast_name][hour] += 1
                        total_by_hour[hour] += 1
                        any_data = True
                except Exception as e:
                    print("取得エラー:", e)
        if not any_data or not found_any or len(diary_rows) < 30:
            break
        start += 1

    by_hour = {cast: dict(hour_count) for cast, hour_count in by_hour.items()}
    total_by_hour = dict(total_by_hour)
    return {
        "ok": True,
        "by_hour": by_hour,
        "total_by_hour": total_by_hour,
        "diaries": diaries
    }