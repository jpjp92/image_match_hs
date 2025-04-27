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

# 정적 파일 및 템플릿 설정
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Supabase 설정
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Pydantic 모델 정의
class ScoreCreate(BaseModel):
    player_name: str
    score: int
    difficulty: str
    time_taken: int

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

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
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

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
