from flask import Flask, render_template, jsonify, request
from supabase import create_client, Client
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Supabase 설정
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/scores', methods=['GET'])
def get_scores():
    try:
        response = supabase.table('amen_mh_score')\
            .select('player_name,score,difficulty,time_taken')\
            .order('score', desc=True)\
            .limit(10)\
            .execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/scores', methods=['POST'])
def save_score():
    try:
        data = request.json
        result = supabase.table('amen_mh_score').insert({
            'player_name': data['player_name'],
            'score': data['score'],
            'difficulty': data['difficulty'],
            'time_taken': data['time_taken'],
            'created_at': datetime.now().isoformat()
        }).execute()
        return jsonify(result.data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
