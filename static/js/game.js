class ImageMatchingGame {
    constructor() {
        this.gameStarted = false;
        this.selectedCards = [];
        this.matchedCards = [];
        this.timeLimit = 60;
        this.remainingTime = this.timeLimit;
        this.timer = null;
        this.mode = "normal";
        this.totalImages = 15;
        this.preloadedImages = new Map();
        
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeElements();
            this.addEventListeners();
            this.setupGameBoard();
        });
    }

    initializeElements() {
        this.playerNameInput = document.getElementById('playerName');
        this.difficultySelect = document.getElementById('difficulty');
        this.startButton = document.getElementById('startButton');
        this.statusLabel = document.getElementById('status');
        this.timerLabel = document.getElementById('timer');
        this.gameBoard = document.getElementById('gameBoard');
    }

    addEventListeners() {
        this.startButton.addEventListener('click', () => this.startGame());
        this.difficultySelect.addEventListener('change', (e) => this.changeDifficulty(e.target.value));
    }

    preloadImages(imageNumbers) {
        const promises = imageNumbers.map(n => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    this.preloadedImages.set(`/static/images/${n}.jpg`, img);
                    resolve(img);
                };
                img.onerror = () => {
                    console.error(`Failed to load image: ${n}.jpg`);
                    const fallbackImg = new Image();
                    fallbackImg.src = '/static/images/1.jpg';
                    this.preloadedImages.set(`/static/images/${n}.jpg`, fallbackImg);
                    resolve(fallbackImg);
                };
                img.src = `/static/images/${n}.jpg`;
            });
        });
        return Promise.all(promises);
    }

    changeDifficulty(difficulty) {
        this.mode = difficulty;
        // 모든 모드 50초로 통일
        this.timeLimit = 60;
        this.remainingTime = this.timeLimit;
        this.updateTimer();
        this.setupGameBoard();
    }

    getCardCount() {
        return {
            'easy': 12,    // 4x3 = 12장
            'normal': 20,  // 5x4 = 20장
            'hard': 30     // 6x5 = 30장
        }[this.mode];
    }

    getGridColumns() {
        return {
            'easy': 4,
            'normal': 5,
            'hard': 6
        }[this.mode];
    }

    async setupGameBoard() {
        this.gameBoard.innerHTML = '';
        const numCards = this.getCardCount();
        const numPairs = numCards / 2;
        
        let imageNumbers = Array.from({length: this.totalImages}, (_, i) => i + 1);
        this.shuffleArray(imageNumbers);
        imageNumbers = imageNumbers.slice(0, numPairs);
        
        try {
            await this.preloadImages(imageNumbers);
        } catch (error) {
            console.error('이미지 프리로드 실패:', error);
            this.statusLabel.textContent = '이미지 로드 중 오류가 발생했습니다.';
            return;
        }

        let images = imageNumbers.flatMap(n => [`/static/images/${n}.jpg`, `/static/images/${n}.jpg`]);
        this.shuffleArray(images);

        const gridColumns = this.getGridColumns();
        this.gameBoard.style.gridTemplateColumns = `repeat(${gridColumns}, 1fr)`;

        images.forEach((img, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.index = index;
            
            const cachedImg = this.preloadedImages.get(img)?.cloneNode() || document.createElement('img');
            if (!this.preloadedImages.has(img)) {
                cachedImg.src = img;
                cachedImg.onerror = () => {
                    console.error(`Failed to load image: ${img}`);
                    cachedImg.src = '/static/images/1.jpg';
                };
            }
            
            card.appendChild(cachedImg);
            card.addEventListener('click', () => this.flipCard(card, index));
            this.gameBoard.appendChild(card);
        });
    }

    async startGame() {
        const playerName = this.playerNameInput.value.trim();
        if (!playerName) {
            alert('플레이어 이름을 입력해주세요!');
            return;
        }

        if (!this.gameStarted) {
            this.statusLabel.textContent = '이미지를 불러오는 중...';
            try {
                await this.setupGameBoard();
                this.gameStartTime = Date.now();
                this.initialize();
                this.gameStarted = true;
                this.startButton.disabled = true;
                this.difficultySelect.disabled = true;
                this.playerNameInput.disabled = true;
                
                this.statusLabel.textContent = '10초 후 게임이 시작됩니다.';
                this.showCards(10000); // 모든 모드 10초 미리보기

                this.remainingTime = this.timeLimit;
                this.updateTimer();
                this.startTimer();
            } catch (error) {
                console.error('게임 시작 중 오류:', error);
                this.statusLabel.textContent = '게임 시작 중 오류가 발생했습니다.';
            }
        }
    }

    initialize() {
        this.selectedCards = [];
        this.matchedCards = [];
    }

    showCards(duration) {
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => card.classList.add('flipped'));
        setTimeout(() => this.hideCards(), duration);
    }

    hideCards() {
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            if (!this.matchedCards.includes(parseInt(card.dataset.index))) {
                card.classList.remove('flipped');
            }
        });
        this.statusLabel.textContent = '게임 시작!';
    }

    flipCard(card, index) {
        if (this.gameStarted && 
            !this.selectedCards.includes(index) && 
            !this.matchedCards.includes(index) &&
            this.selectedCards.length < 2) {
            
            this.selectedCards.push(index);
            card.classList.add('flipped');

            if (this.selectedCards.length === 2) {
                setTimeout(() => this.checkMatch(), 200);
            }
        }
    }

    checkMatch() {
        const [index1, index2] = this.selectedCards;
        const cards = document.querySelectorAll('.card');
        const card1 = cards[index1];
        const card2 = cards[index2];

        if (card1.querySelector('img').src === card2.querySelector('img').src) {
            this.matchedCards.push(index1, index2);
            if (this.matchedCards.length === this.getCardCount()) {
                this.endGame(true);
            }
        } else {
            setTimeout(() => {
                card1.classList.remove('flipped');
                card2.classList.remove('flipped');
            }, 300);
        }
        this.selectedCards = [];
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    startTimer() {
        clearInterval(this.timer);
        this.timer = setInterval(() => {
            if (this.remainingTime > 0) {
                this.remainingTime--;
                this.updateTimer();
            } else {
                this.endGame(false);
            }
        }, 1000);
    }

    updateTimer() {
        this.timerLabel.textContent = `남은 시간: ${this.remainingTime}초`;
    }

    calculateScore(success, timeTaken) {
        if (!success) return 0;
        const baseScore = 1000;
        const timePenalty = timeTaken * 2;
        const difficultyMultiplier = {
            'easy': 1,
            'normal': 1.5,
            'hard': 2.0  // 하드 모드 2배 보너스
        }[this.mode];
        
        const finalScore = Math.max(0, 
            Math.floor((baseScore - timePenalty) * difficultyMultiplier));
        return finalScore;
    }

    async saveScore(success) {
        const timeTaken = Math.floor((Date.now() - this.gameStartTime) / 1000);
        const score = this.calculateScore(success, timeTaken);

        try {
            const response = await fetch('/api/scores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    player_name: this.playerNameInput.value,
                    score: score,
                    difficulty: this.mode,
                    time_taken: timeTaken
                })
            });
            
            if (!response.ok) throw new Error('점수 저장 실패');
            
            await this.updateLeaderboard();
        } catch (error) {
            console.error('점수 저장 중 오류:', error);
            alert('점수 저장 중 오류가 발생했습니다.');
        }
    }

    maskPlayerName(name) {
        if (name.length <= 1) return name;
        const firstChar = name.charAt(0);
        const maskedPart = '*'.repeat(name.length - 1);
        return firstChar + maskedPart;
    }

    async updateLeaderboard() {
        try {
            const response = await fetch('/api/scores');
            if (!response.ok) throw new Error('리더보드 데이터 가져오기 실패');
            
            const scores = await response.json();
            const tbody = document.querySelector('#scoresTable tbody');
            tbody.innerHTML = '';
            
            scores.forEach(score => {
                const row = tbody.insertRow();
                row.insertCell().textContent = this.maskPlayerName(score.player_name);
                row.insertCell().textContent = score.score;
                row.insertCell().textContent = score.difficulty;
                row.insertCell().textContent = `${score.time_taken}초`;
            });
        } catch (error) {
            console.error('리더보드 업데이트 중 오류:', error);
            alert('리더보드 업데이트 중 오류가 발생했습니다.');
        }
    }

    endGame(success) {
        clearInterval(this.timer);
        this.gameStarted = false;
        this.saveScore(success);
        this.statusLabel.textContent = success ? 
            '게임 성공! 모든 카드를 맞췄습니다.' : 
            '게임 실패! 시간이 초과되었습니다.';

        if (confirm('다시 하시겠습니까?')) {
            this.completeReset();
        }
    }

    completeReset() {
        this.mode = 'normal';
        this.difficultySelect.value = 'normal';
        this.difficultySelect.disabled = false;
        this.startButton.disabled = false;
        this.playerNameInput.disabled = false;
        this.gameStarted = false;
        this.preloadedImages.clear();
        this.setupGameBoard();
        this.remainingTime = this.timeLimit;
        this.updateTimer();
        this.statusLabel.textContent = '';
    }
}

// 게임 인스턴스 생성
const game = new ImageMatchingGame();
