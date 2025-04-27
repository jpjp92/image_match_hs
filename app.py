from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from supabase import create_client
from datetime import datetime
import os
from dotenv import load_dotenv
from mangum import Mangum

# 환경 변수 로드
load_dotenv()

app = FastAPI()

# Supabase 설정
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY')

# 환경 변수 확인
if not SUPABASE_URL or not SUPABASE_KEY:
    print("경고: Supabase 환경 변수가 설정되지 않았습니다.")

# Supabase 클라이언트 생성
try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"Supabase 연결 오류: {e}")
    supabase = None

# Pydantic 모델 정의
class ScoreCreate(BaseModel):
    player_name: str
    score: int
    difficulty: str
    time_taken: int

@app.get("/", response_class=HTMLResponse)
async def index():
    # 서버리스 환경에서는 간단한 HTML 응답만 반환
    html_content = """
    <!DOCTYPE html>
    <html>
        <head>
            <title>점수 API</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }
                h1 {
                    color: #333;
                }
                .endpoint {
                    background-color: #f4f4f4;
                    padding: 10px;
                    border-radius: 5px;
                    margin-bottom: 10px;
                }
                code {
                    background-color: #eee;
                    padding: 2px 5px;
                    border-radius: 3px;
                }
            </style>
        </head>
        <body>
            <h1>점수 API</h1>
            <p>API가 정상적으로 실행 중입니다.</p>
            
            <h2>사용 가능한 엔드포인트:</h2>
            
            <div class="endpoint">
                <h3>GET /api/scores</h3>
                <p>상위 10개의 점수를 가져옵니다.</p>
            </div>
            
            <div class="endpoint">
                <h3>POST /api/scores</h3>
                <p>새로운 점수를 저장합니다. 다음 JSON 형식으로 요청해야 합니다:</p>
                <pre><code>
{
    "player_name": "플레이어 이름",
    "score": 1000,
    "difficulty": "easy",
    "time_taken": 60
}
                </code></pre>
            </div>
        </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@app.get("/api/scores")
async def get_scores():
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase 연결이 설정되지 않았습니다")
    
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
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase 연결이 설정되지 않았습니다")
    
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

# Vercel 서버리스 함수 핸들러
handler = Mangum(app)

# 로컬에서 실행할 때만 사용
if __name__ == '__main__':
    import uvicorn
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
