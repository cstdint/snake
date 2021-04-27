"use strict"

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomRGB(minRGBSum, maxRGBSum) {
	const MAX_RGB_SUM = 255 + 255 + 255;
	
	minRGBSum = Math.floor(Number(minRGBSum));
	maxRGBSum = Math.floor(Number(maxRGBSum));
	if (!isFinite(minRGBSum) || minRGBSum < 0)
		minRGBSum = 0;
	if (!isFinite(maxRGBSum) || maxRGBSum > MAX_RGB_SUM)
		maxRGBSum = MAX_RGB_SUM;
	if (maxRGBSum < minRGBSum)
		[minRGBSum, maxRGBSum] = [maxRGBSum, minRGBSum];
	
	let componentSum = getRandomInt(minRGBSum, maxRGBSum);
	let colors = [];
	let colorMin = Math.max(0, componentSum - 2 * 255);
	let colorMax = Math.min(255, componentSum);
	colors.push(getRandomInt(colorMin, colorMax));
	
	componentSum = componentSum - colors[0];
	colorMin = Math.max(0, componentSum - 255);
	colorMax = Math.min(255, componentSum)
	colors.push(getRandomInt(colorMin, colorMax));
	
	colors.push(componentSum - colors[1]);
	
	for (let i = 0; i < colors.length - 1; ++i) {
		let pos = getRandomInt(i, colors.length - 1);
		if (pos !== i)
			[colors[i], colors[pos]] = [colors[pos], colors[i]];
	}
	
	return colors;
}

class Queue {
	constructor(maxLength) {
		this._maxLength = maxLength;
		this._buffer = [];
	}
	add(val) {
		if (this._buffer.length >= this._maxLength)
			this._buffer.shift();
		this._buffer.push(val);
	}
	extract() {
		return this._buffer.shift();
	}
	clear() {
		this._buffer = [];
	}
	empty() {
		return this._buffer.length === 0;
	}
}

function mainSnake() {
	const STATE = {
		play:  0,
		win:   1,
		lose:  2,
		pause: 3,
	};
	const DIR = {
		free:  0,
		up:    1,
		right: 2,
		down:  3,
		left:  4,
		food:  5,
	};
	const EVENT = {
		up:      0,
		right:   1,
		down:    2,
		left:    3,
		pause:   4,
		newGame: 5,
		timeout: 6,
	};
	
	class InfoBlock {
		constructor(scoreElement, stateElement) {
			this._scoreElement = scoreElement;
			this._stateElement = stateElement;
			this._text = {
				[STATE.play]:  "Играем...",
				[STATE.win]:   "Победа",
				[STATE.lose]:  "Проигрыш",
				[STATE.pause]: "Пауза",
			};
		}
		setScore(score) {
			this._scoreElement.textContent = score;
		}
		setState(state) {
			this._stateElement.textContent = this._text[state];
		}
	}
	
	class Snake {
		constructor(rows, cols) {
			if (!rows || !cols || rows < 8 || cols < 8)
				throw new Error("Snake::constructor error!");
			this._rows  = rows;
			this._cols  = cols;
			
			this.defaultState();
		}
		defaultState() {
			this._score = 0;
			
			this._state = STATE.play;
			
			const fieldSize = this._rows * this._cols;
			this._field = [];
			for (let i = 0; i < fieldSize; ++i)
				this._field.push(DIR.free);
			
			let x = Math.floor(this._cols * 0.5) - 2;
			let y = Math.floor(this._rows * 0.5);
			this._end = {x, y};
			
			for (let i = 0; i < 4; ++i) {
				this._fieldSet(x, y, DIR.right);
				++x;
			}
			--x;
			
			this._head = {x, y};
			
			this._food = this._getFoodPosition();
		}
		nextStep(dir) {
			let headDir = this._fieldGet(this._head.x, this._head.y);
			if (dir === undefined)
				dir = headDir;
			else
				dir = this._dirCorrection(headDir, dir);
			this._fieldSet(this._head.x, this._head.y, dir);
			
			let {x: nextX, y: nextY} = this._getNextPosition(this._head);
			let nextSegment = this._fieldGet(nextX, nextY);
			
			let res = {
				state: STATE.play,
				headOld: {x: this._head.x, y: this._head.y},
				head:    {x: nextX, y: nextY},
				endOld:  {dir: DIR.food, x: this._end.x, y: this._end.y},
				food:    {dir: DIR.free, x: this._food.x, y: this._food.y},
				dir: dir,
			};
			
			if (nextSegment !== DIR.food) {
				let nextEnd = this._getNextPosition(this._end);
				this._fieldSet(this._end.x, this._end.y, DIR.free);
				this._end = nextEnd;
				nextSegment = this._fieldGet(nextX, nextY);
				res.endOld.dir = DIR.free;
			}
			
			switch (nextSegment) {
				case DIR.free:
					this._fieldSet(nextX, nextY, dir);
					this._head = {x: nextX, y: nextY};
					break;
				case DIR.up:
				case DIR.right:
				case DIR.down:
				case DIR.left:
					res.state = STATE.lose;
					break;
				case DIR.food:
					++this._score;
					this._fieldSet(nextX, nextY, dir);
					this._head = {x: nextX, y: nextY};
					let foodPosition = this._getFoodPosition();
					if (foodPosition === null) {
						res.state = STATE.win;
						break;
					}
					this._fieldSet(foodPosition.x, foodPosition.y, DIR.food);
					this._food = foodPosition;
					res.food.dir   = DIR.food;
					res.food.x     = foodPosition.x;
					res.food.y     = foodPosition.y;
					break;
			}
			
			return res;
		}
		getScore() {
			return this._score;
		}
		getRows() {
			return this._rows;
		}
		getCols() {
			return this._cols;
		}
		getSnakeArray() {
			let res = [];
			let pos = this._end;
			while (pos.x !== this._head.x || pos.y !== this._head.y) {
				res.push({x: pos.x, y: pos.y});
				pos = this._getNextPosition(pos);
			}
			res.push({x: pos.x, y: pos.y});
			return res;
		}
		getSnakeHead() {
			let dir = this._fieldGet(this._head.x, this._head.y);
			return {dir: dir, x: this._head.x, y: this._head.y};
		}
		getFood() {
			return {x: this._food.x, y: this._food.y};
		}
		
		
		_fieldGet(x, y) {
			return this._field[y * this._cols + x];
		}
		_fieldSet(x, y, val) {
			this._field[y * this._cols + x] = val;
		}
		_getFoodPosition() {
			let freeCounter = 0;
			for (let segment of this._field)
				freeCounter += segment === DIR.free;
			
			if (freeCounter === 0)
				return null;
			
			const foodIndex = getRandomInt(0, freeCounter - 1);
			let   currentIndex = 0;
			for (let y = 0; y < this._rows; ++y)
				for (let x = 0; x < this._cols; ++x)
					if (this._fieldGet(x, y) === DIR.free) {
						if (currentIndex === foodIndex) {
							this._fieldSet(x, y, DIR.food);
							return {x, y};
						}
						++currentIndex;
					}
		}
		_getNextPosition(pos) {
			let {x, y} = pos;
			let dir = this._fieldGet(x, y);
			switch (dir) {
				case DIR.up:
					--y;
					break;
				case DIR.right:
					++x;
					break;
				case DIR.down:
					++y;
					break;
				case DIR.left:
					--x;
					break;
			}
			if (x < 0)
				x = this._cols - 1;
			else if (x >= this._cols)
				x = 0;
			if (y < 0)
				y = this._rows - 1;
			else if (y >= this._rows)
				y = 0;
			return {x, y};
		}
		_dirCorrection(headDir, dir) {
			if (headDir === DIR.up && dir === DIR.down)
				return headDir;
			if (headDir === DIR.right && dir === DIR.left)
				return headDir;
			if (headDir === DIR.down && dir === DIR.up)
				return headDir;
			if (headDir === DIR.left && dir === DIR.right)
				return headDir;
			return dir;
		}
	}
	
	class Painter {
		constructor(param) {
			this._context = param.context;
			this._rows    = param.rows;
			this._cols    = param.cols;
			
			this._borderWidth = param.borderWidth;
			this._gridWidth   = param.gridWidth;
			this._cellWidth   = param.cellWidth;
			
			this._minRGBSum = param.minRGBSum;
			this._maxRGBSum = param.maxRGBSum;
			
			this._currentColorDefault = param.currentColorDefault;
			this._backgroundColor     = param.backgroundColor;
			
			this._currentColor    = this._currentColorDefault;
			this._foodColor       = getRandomRGB(this._minRGBSum, this._maxRGBSum);
			
			this._context.canvas.width  = 2 * this._borderWidth + this._cols * (this._cellWidth + this._gridWidth);
			this._context.canvas.height = 2 * this._borderWidth + this._rows * (this._cellWidth + this._gridWidth);
			this.clearCanvas();
		}
		clearCanvas() {
			this._context.fillStyle = this._backgroundColor;
			this._context.fillRect(0, 0, this._context.canvas.width, this._context.canvas.height);
		}
		clearSegment(x, y) {
			this._innerDrawSegment(x, y, this._backgroundColor);
		}
		drawSegment(x, y) {
			this._innerDrawSegment(x, y, this._currentColor);
		}
		drawFood(x, y) {
			x = this._borderWidth + x * (this._cellWidth + this._gridWidth);
			y = this._borderWidth + y * (this._cellWidth + this._gridWidth);
			this._context.fillStyle = this._foodColor;
			this._context.fillRect(x, y, this._cellWidth, this._cellWidth);
			
			const diff  = this._cellWidth * 0.25;
			const diff2 = 2 * diff;
			this._context.fillStyle = this._backgroundColor;
			this._context.fillRect(x + diff, y + diff, diff2, diff2);
		}
		drawHead(x, y, dir) {
			x = this._borderWidth + x * (this._cellWidth + this._gridWidth);
			y = this._borderWidth + y * (this._cellWidth + this._gridWidth);
			const cellWidth = this._cellWidth;
			const cellWidth_2 = cellWidth * 0.5;
			
			this._context.fillStyle = "rgb(230,230,230)";
			this._context.fillRect(x, y, cellWidth, cellWidth);
			
			this._context.fillStyle = "rgb(0,0,0)";
			switch (dir) {
				case DIR.up:
					this._context.fillRect(x, y, cellWidth, cellWidth_2);
					break;
				case DIR.right:
					this._context.fillRect(x + cellWidth_2, y, cellWidth_2, cellWidth);
					break;
				case DIR.down:
					this._context.fillRect(x, y + cellWidth_2, cellWidth, cellWidth_2);
					break;
				case DIR.left:
					this._context.fillRect(x, y, cellWidth_2, cellWidth);
					break;
			}
		}
		setCurrentColorFromFood() {
			this._currentColor = this._foodColor;
		}
		setCurrentColorFromDefault() {
			this._currentColor = this._currentColorDefault;
		}
		updateFoodColor() {
			this._foodColor = "rgb(" + getRandomRGB(this._minRGBSum, this._maxRGBSum).join(",") + ")";
		}
		
		
		_innerDrawSegment(x, y, color) {
			this._context.fillStyle = color;
			x = this._borderWidth + x * (this._cellWidth + this._gridWidth);
			y = this._borderWidth + y * (this._cellWidth + this._gridWidth);
			this._context.fillRect(x, y, this._cellWidth, this._cellWidth);
		}
	}
	
	class SnakeLogic {
		constructor(param) {
			this._painter   = param.painter;
			this._snake     = param.snake;
			this._infoBlock = param.infoBlock;
			
			this._timeout      = param.timeout;
			this._timeoutPause = param.timeoutPause;
			
			this._queue = new Queue(param.queueMaxLength);
			
			this._state = STATE.win;
			
			this._timerID = null;
		}
		processEvent(event) {
			switch (event) {
				case EVENT.up:
					if (this._state === STATE.play)
						this._queue.add(DIR.up);
					break;
				case EVENT.right:
					if (this._state === STATE.play)
						this._queue.add(DIR.right);
					break;
				case EVENT.down:
					if (this._state === STATE.play)
						this._queue.add(DIR.down);
					break;
				case EVENT.left:
					if (this._state === STATE.play)
						this._queue.add(DIR.left);
					break;
				case EVENT.pause:
					if (this._state === STATE.pause) {
						this._state = STATE.play;
						this._queue.clear();
						this._infoBlock.setState(STATE.play);
						if (this._timerID !== null)
							clearTimeout(this._timerID);
						this._timerID = setTimeout(() => this.processEvent(EVENT.timeout), this._timeoutPause);
					} else if (this._state === STATE.play) {
						this._state = STATE.pause;
						this._infoBlock.setState(STATE.pause);
						if (this._timerID !== null) {
							clearTimeout(this._timerID);
							this._timerID = null;
						}
					}
					break;
				case EVENT.newGame:
					this._painter.clearCanvas();
					this._painter.setCurrentColorFromDefault();
					this._painter.updateFoodColor();
					
					this._snake.defaultState();
					this._snake.getSnakeArray().forEach(e => this._painter.drawSegment(e.x, e.y));
					let snakeHead = this._snake.getSnakeHead();
					this._painter.drawHead(snakeHead.x, snakeHead.y, snakeHead.dir);
					let food = this._snake.getFood();
					this._painter.drawFood(food.x, food.y);
					
					this._infoBlock.setState(STATE.play);
					this._infoBlock.setScore(0);
					
					this._queue.clear();
					
					this._state = STATE.play;
					
					if (this._timerID !== null)
						clearTimeout(this._timerID);
					this._timerID = setTimeout(() => this.processEvent(EVENT.timeout), this._timeoutPause);
					break;
				case EVENT.timeout:
					this._timerID = null;
					let data = this._snake.nextStep(this._queue.extract());
					this._state = data.state;
					if (data.state === STATE.play) {
						if (data.endOld.dir === DIR.free)
							this._painter.clearSegment(data.endOld.x, data.endOld.y);
						this._painter.drawSegment(data.headOld.x, data.headOld.y);
						if (data.food.dir === DIR.food) {
							this._painter.setCurrentColorFromFood();
							this._painter.updateFoodColor();
							this._painter.drawFood(data.food.x, data.food.y);
							this._infoBlock.setScore(this._snake.getScore());
						}
						this._painter.drawHead(data.head.x, data.head.y, data.dir);
						this._timerID = setTimeout(() => this.processEvent(EVENT.timeout), this._timeout);
					} else {
						this._infoBlock.setState(data.state);
						this._infoBlock.setScore(this._snake.getScore());
					}
					break;
			}
		}
	}
	
	function keyboardHandler(event, snakeLogic) {
		let flagPreventDefault = true;
		switch (event.code) {
			case "ArrowUp":
			case "KeyW":
				snakeLogic.processEvent(EVENT.up);
				break;
			case "ArrowRight":
			case "KeyD":
				snakeLogic.processEvent(EVENT.right);
				break;
			case "ArrowDown":
			case "KeyS":
				snakeLogic.processEvent(EVENT.down);
				break;
			case "ArrowLeft":
			case "KeyA":
				snakeLogic.processEvent(EVENT.left);
				break;
			case "Space":
				snakeLogic.processEvent(EVENT.pause);
				break;
			case "KeyG":
				snakeLogic.processEvent(EVENT.newGame);
				break;
			default:
				flagPreventDefault = false;
		}
		if (flagPreventDefault)
			event.preventDefault();
	}
	
	function prepare() {
		const scoreElement = document.getElementById("span-score");
		const stateElement = document.getElementById("span-state");
		const infoBlock    = new InfoBlock(scoreElement, stateElement);
		
		const rows = 30;
		const cols = 50;
		
		const snake = new Snake(rows, cols);
		
		const painterParam = {
			context: document.getElementById("canvas-id").getContext("2d"),
			rows:        rows,
			cols:        cols,
			borderWidth: 0,
			gridWidth:   1,
			cellWidth:   10,
			minRGBSum:   0,
			maxRGBSum:   600,
			currentColorDefault: "rgb(100,100,100)",
			backgroundColor:     "rgb(250,250,250)",
		};
		const painter = new Painter(painterParam);
		
		const snakeLogicParam = {
			painter:        painter,
			snake:          snake,
			infoBlock:      infoBlock,
			timeout:        144,
			timeoutPause:   1000,
			queueMaxLength: 2,
		};
		const snakeLogic = new SnakeLogic(snakeLogicParam);
		
		document.body.addEventListener("keydown", event => keyboardHandler(event, snakeLogic));
		snakeLogic.processEvent(EVENT.newGame);
	}
	prepare();
}

mainSnake();






























