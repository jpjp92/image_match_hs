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
        
        // 모바일 기기 감지
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.touchStartY = 0;
        
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeElements();
            this.addEventListeners();
            this.setupGameBoard();
            this.setViewportHeight();
            this.setGameBoardHeight();
        });
    }

    // 뷰포트 높이를 동적으로 설정하는 메서드
    setViewportHeight() {
        const setVh = () => {
            let vh;
            if ('visualViewport' in window) {
                vh = window.visualViewport.height * 0.01;
            } else {
                vh = window.innerHeight * 0.01;
            }
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };

        setVh();
        window.addEventListener('resize', setVh);
        window.addEventListener('orientationchange', setVh);
        if ('visualViewport' in window) {
            window.visualViewport.addEventListener('resize', setVh);
        }
    }

    // 게임 보드의 최대 높이를 동적으로 설정
    setGameBoardHeight() {
        const setHeight = () => {
            const gameHeader = document.querySelector('.game-header');
            const gameBoard = document.querySelector('.game-board');
            if (gameHeader && gameBoard) {
                const headerRect = gameHeader.getBoundingClientRect();
                const headerHeight = headerRect.height;
                let availableHeight;
                if ('visualViewport' in window) {
                    availableHeight = window.visualViewport.height - headerHeight - 15;
                } else {
                    availableHeight = window.innerHeight - headerHeight - 15;
                }
                gameBoard.style.maxHeight = `${availableHeight}px`;
                console.log(`Header Height: ${headerHeight}px, Available Height: ${availableHeight}px`);
            }
        };

        setHeight();
        window.addEventListener('resize', setHeight);
        window.addEventListener('orientationchange', setHeight);
        if ('visualViewport' in window) {
            window.visualViewport.addEventListener('resize', setHeight);
        }
    }

    initializeElements() {
        this.playerNameInput = document.getElementById('playerName');
        this.difficultySelect = document.getElementById('difficulty');
        this.startButton = document.getElementById('startButton');
        this.status = document.getElementById('status');
        this.timer = document.getElementById('timer');
        this.gameBoard = document.getElementById('gameBoard');
        this.leaderboardModal = document.getElementById('leaderboardModal');
        this.showLeaderboardButton = document.getElementById('showLeaderboard');
        this.closeButton = document.querySelector('.close');
        
        if (this.closeButton) {
            this.closeButton.style.display = 'block';
        }
    }

    addEventListeners() {
        this.startButton.addEventListener('click', () => this.startGame());
        this.difficultySelect.addEventListener('change', (e) => this.changeDifficulty(e.target.value));
        this.showLeaderboardButton.addEventListener('click', () => this.showLeaderboard());
        this.closeButton.addEventListener('click', () => this.hideLeaderboard());
        
        document.addEventListener('touchmove', function(e) {
            if (!e.target.closest('.modal-content')) {
                e.preventDefault();
            }
        }, { passive: false });
        
        document.addEventListener('touchend', function(e) {
            const now = Date.now();
            const DOUBLE_PRESS_DELAY = 300;
            if (this.lastTap && (now - this.lastTap) < DOUBLE_PRESS_DELAY) {
                e.preventDefault();
            }
            this.lastTap = now;
        }.bind(this), false);
        
        if (this.isMobile) {
            this.leaderboardModal.addEventListener('touchstart', (e) => {
                this.touchStartY = e.touches[0].clientY;
            });

            this.leaderboardModal.addEventListener('touchmove', (e) => {
                const touchEndY = e.touches[0].clientY;
                const modalContent = this.leaderboardModal.querySelector('.modal-content');
                
                if (!modalContent.contains(e.target)) {
                    if (Math.abs(touchEndY - this.touchStartY) > 50) {
                        this.hideLeaderboard();
                    }
                }
            });
        }

        this.leaderboardModal.addEventListener(this.isMobile ? 'touchend' : 'click', (e) => {
            const modalContent = this.leaderboardModal.querySelector('.modal-content');
            if (e.target === this.leaderboardModal && !modalContent.contains(e.target)) {
                this.hideLeaderboard();
            }
        });
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
                    fallbackImg.src = '/static/images/fallback.jpg';
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
        this.timeLimit = 60;
        this.remainingTime = this.timeLimit;
        this.updateTimer();
        this.setupGameBoard();
        this.setGameBoardHeight();
    }

    getCardCount() {
        return {
            'easy': 12,
            'normal': 20,
            'hard': 30
        }[this.mode];
    }

    getGridColumns() {
        return {
            'easy': 4, // 4열 (4x3)
            'normal': 5, // 5열 (5x4)
            'hard': 6 // 6열 (6x5)
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
            this.status.textContent = '이미지 로드 중 오류가 발생했습니다.';
            return;
        }

        let images = [];
        imageNumbers.forEach(n => {
            images.push(`/static/images/${n}.jpg`);
            images.push(`/static/images/${n}.jpg`);
        });
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
                    cachedImg.src = '/static/images/fallback.jpg';
                };
            }
            
            card.appendChild(cachedImg);
            
            const handleCardInteraction = (e) => {
                e.preventDefault();
                if (!this.gameStarted) return;
                this.flipCard(card, index);
            };
            
            card.addEventListener('click', handleCardInteraction);
            card.addEventListener('touchend', handleCardInteraction, { passive: false });
            
            this.gameBoard.appendChild(card);
        });

        this.setGameBoardHeight();
    }

    async startGame() {
        const playerName = this.playerNameInput.value.trim();
        if (!playerName) {
            alert('플레이어 이름을 입력해주세요!');
            return;
        }

        if (!this.gameStarted) {
            this.status.textContent = '이미지를 불러오는 중...';
            try {
                await this.setupGameBoard();
                this.gameStartTime = Date.now();
                this.initialize();
                this.gameStarted = true;
                this.startButton.disabled = true;
                this.difficultySelect.disabled = true;
                this.playerNameInput.disabled = true;
                
                this.status.textContent = '10초 후 게임이 시작됩니다.';
                this.showCards(10000);

                this.remainingTime = this.timeLimit;
                this.updateTimer();
                this.startTimer();
            } catch (error) {
                console.error('게임 시작 중 오류:', error);
                this.status.textContent = '게임 시작 중 오류가 발생했습니다.';
            }
        }
    }

    initialize() {
        this.selectedCards = [];
        this.matchedCards = [];
        clearInterval(this.timer);
        this.timer = null;
    }

    showCards(duration) {
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => card.classList.add('flipped'));
        console.log('Cards shown for 10 seconds');
        setTimeout(() => {
            this.hideCards();
            console.log('Cards hidden after 10 seconds');
        }, duration);
    }

    hideCards() {
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            if (!this.matchedCards.includes(parseInt(card.dataset.index))) {
                card.classList.remove('flipped');
            }
        });
        this.status.textContent = '게임 시작!';
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
        return array;
    }

    startTimer() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        this.timer = setInterval(() => {
            console.log(`Remaining Time: ${this.remainingTime}`);
            if (this.remainingTime > 0) {
                this.remainingTime--;
                this.updateTimer();
            } else {
                this.endGame(false);
            }
        }, 1000);
    }

    updateTimer() {
        this.timer.textContent = `남은 시간: ${this.remainingTime}초`;
    }

    calculateScore(success, timeTaken) {
        if (!success) return 0;
        const baseScore = 100;
        const timePenalty = timeTaken * 0.2;
        const difficultyMultiplier = {
            'easy': 1,
            'normal': 1.5,
            'hard': 2.0
        }[this.mode];
        
        return (baseScore - timePenalty) * difficultyMultiplier;
    }
    
    async saveScore(success) {
        const timeTaken = Math.floor((Date.now() - this.gameStartTime) / 1000);
        let score = this.calculateScore(success, timeTaken);
        score = Math.round(score);
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
            return true;
        } catch (error) {
            console.error('점수 저장 중 오류:', error);
            alert('점수 저장 중 오류가 발생했습니다.');
            return false;
        }
    }

    showLeaderboard() {
        this.updateLeaderboard().then(() => {
            this.leaderboardModal.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            if (this.isMobile) {
                document.body.style.position = 'fixed';
                document.body.style.width = '100%';
                document.body.style.top = `-${window.scrollY}px`;
            }
        });
    }

    hideLeaderboard() {
        this.leaderboardModal.classList.remove('show');
        
        if (this.isMobile) {
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.top = '';
            window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
        
        document.body.style.overflow = '';
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
            
            let scores = await response.json();
            
            scores.sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                return a.time_taken - b.time_taken;
            });

            const tbody = document.querySelector('#scoresTable tbody');
            tbody.innerHTML = '';
            
            const medals = {
                1: '🥇',
                2: '🥈',
                3: '🥉'
            };
            
            scores.forEach((score, index) => {
                const row = tbody.insertRow();
                if (index < 3) {
                    row.classList.add('top-three');
                }
                
                const rankCell = row.insertCell();
                if (index < 3) {
                    rankCell.innerHTML = `<span class="medal">${medals[index + 1]}</span>`;
                } else {
                    rankCell.innerHTML = `<span class="rank-number">${index + 1}</span>`;
                }
                
                row.insertCell().textContent = score.player_name;
                row.insertCell().innerHTML = `<span class="highlight-score">${Math.floor(score.score)}</span>`;
                row.insertCell().textContent = score.difficulty;
                row.insertCell().textContent = `${score.time_taken}초`;
                
                if (index < 3) {
                    row.style.backgroundColor = ['#fff9db', '#f8f9fa', '#f1f3f5'][index];
                }
            });
        } catch (error) {
            console.error('리더보드 업데이트 중 오류:', error);
            alert('리더보드 업데이트 중 오류가 발생했습니다.');
        }
    }

    endGame(success) {
        clearInterval(this.timer);
        this.gameStarted = false;
        this.saveScore(success).then(() => {
            this.status.textContent = success ? 
                '게임 성공! 모든 카드를 맞췄습니다.' : 
                '게임 실패! 시간이 초과되었습니다.';
            
            this.showLeaderboard();
            
            setTimeout(() => {
                if (confirm('다시 하시겠습니까?')) {
                    this.hideLeaderboard();
                    this.completeReset();
                }
            }, 1000);
        });
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
        this.status.textContent = '';
    }
}

const game = new ImageMatchingGame();
