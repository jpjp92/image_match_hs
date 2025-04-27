from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from supabase import create_client, Client
from datetime import datetime
import os
from dotenv import load_dotenv
import uvicorn

load_dotenv()

app = FastAPI()

# 템플릿 디렉토리 설정 - 실제 경로에 맞게 조정하세요
try:
    templates = Jinja2Templates(directory="templates")
    # 정적 파일이 필요한 경우에만 사용
    app.mount("/static", StaticFiles(directory="static"), name="static")
except Exception as e:
    print(f"템플릿 또는 정적 파일 설정 오류: {e}")

# Supabase 설정 - 환경 변수 디버깅
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("경고: Supabase 환경 변수가 설정되지 않았습니다.")

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"Supabase 연결 오류: {e}")

# Pydantic 모델 정의
class ScoreCreate(BaseModel):
    player_name: str
    score: int
    difficulty: str
    time_taken: int

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    try:
        return templates.TemplateResponse("index.html", {"request": request})
    except Exception as e:
        print(f"템플릿 렌더링 오류: {e}")
        return HTMLResponse(content="<html><body><h1>서버 오류가 발생했습니다.</h1></body></html>")

@app.get("/api/scores")
async def get_scores():
    try:
        response = supabase.table('amen_mh_score')\
            .select('player_name,score,difficulty,time_taken')\
            .order('score', desc=True)\
            .limit(10)\
            .execute()
        return response.data
    except Exception as e:
        print(f"점수 가져오기 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scores")
async def save_score(score_data: ScoreCreate):
    try:
        result = supabase.table('amen_mh_score').insert({
            'player_name': score_data.player_name,
            'score': score_data.score,
            'difficulty': score_data.difficulty,
            'time_taken': score_data.time_taken,
            'created_at': datetime.now().isoformat()
        }).execute()
        return result.data
    except Exception as e:
        print(f"점수 저장 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

# from flask import Flask, render_template, jsonify, request
# from supabase import create_client, Client
# from datetime import datetime
# import os
# from dotenv import load_dotenv

# load_dotenv()

# app = Flask(__name__)

# # Supabase 설정
# SUPABASE_URL = os.getenv('SUPABASE_URL')
# SUPABASE_KEY = os.getenv('SUPABASE_KEY')
# supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# @app.route('/')
# def index():
#     return render_template('index.html')

# @app.route('/api/scores', methods=['GET'])
# def get_scores():
#     try:
#         response = supabase.table('amen_mh_score')\
#             .select('player_name,score,difficulty,time_taken')\
#             .order('score', desc=True)\
#             .limit(10)\
#             .execute()
#         return jsonify(response.data)
#     except Exception as e:
#         return jsonify({'error': str(e)}), 500

# @app.route('/api/scores', methods=['POST'])
# def save_score():
#     try:
#         data = request.json
#         result = supabase.table('amen_mh_score').insert({
#             'player_name': data['player_name'],
#             'score': data['score'],
#             'difficulty': data['difficulty'],
#             'time_taken': data['time_taken'],
#             'created_at': datetime.now().isoformat()
#         }).execute()
#         return jsonify(result.data)
#     except Exception as e:
#         return jsonify({'error': str(e)}), 500

# if __name__ == '__main__':
#     app.run(debug=True)
