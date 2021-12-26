class Obj {
  super(id, x, y) {
    this.id=id;
    this.x=x;
    this.y=y;
  }
  beforeStep(state) {}
  step(state) {}
  str() {
    var printStr = obj.name;
    var keys = Object.keys(this);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var val = obj[key];
        printStr += `, ${key}: ${val}`;
    }
    return printStr;
  }
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function getRandomText(textOptions) {
  return textOptions[getRandomInt(textOptions.length)]
}

function playSound(audioFile) {
  var audio = new Audio(audioFile);
  audio.play();
}

class TimedTexter extends Obj {
  init(id, x, y, delay, textOptions, color) {
    this.super(id, x, y);
    this.delay = delay;
    this.textOptions = textOptions;
    this.color = color;
    this.count = 0;
    this.timedAction();
  }

  timedAction(state) {
    this.text = getRandomText(this.textOptions);
  }

  beforeStep(state) {
    this.count += 1;
    if (this.count % this.delay === 0) {
      this.timedAction(state);
    }
  }
}


class TimedSounder extends Obj {
  init(id, x, y, delay, audio) {
    this.super(id, x, y);
    this.audio = audio;
    this.delay = delay;
    this.color = "white";
    this.count = 0;
    this.text = "";
  }

  timedAction(state) {
    playSound(this.audio);
  }

  beforeStep(state) {
    this.count += 1;
    if (this.count % this.delay === 0) {
      this.timedAction(state);
    }
  }
}


class Counter extends Obj {
  init(id, x, y, delay, maxCount, color) {
    this.super(id, x, y);
    this.maxCount = maxCount;
    this.delay = delay;
    this.color = color;
    this.delayCount = this.maxCount;
    this.text = "0";
    this.count = 0;
  }

  timedAction(state) {
    this.delayCount -= 1;
    this.text = this.delayCount.toString();
    if (this.delayCount === 0) {
      this.delayCount = this.maxCount;
    }
  }

  beforeStep(state) {
    this.count += 1;
    if (this.count % this.delay === 0) {
      this.timedAction(state);
    }
  }
}


class Tsooper extends Obj {
  init(id, x, y, dir, width, height, alpha=180, beta=17) {
    this.super(id, x, y);
    this.dir = dir;
    this.range = 5;
    this.speed = 0.67;
    this.beta = beta;
    this.alpha = alpha;
    this.boardWidth = width;
    this.boardHeight = height;
    this.color = 'white';
  }

  getColor(n) {
    if (n < 1) {
      return 'grey';
    } else if (n < 2) {
      return 'white';
    } else if (n < 4) {
      return 'yellow';
    } else if (n < 8) {
      return 'orange';
    } else if (n < 16) {
      return 'red';
    } else if (n < 32) {
      return 'purple';
    } else if (n < 64) {
      return 'blue';
    } else {
      return 'pink';
    }
  }

  inRange(obj) {
    var diffx = obj.x - this.x;
    var diffy = obj.y - this.y;
    return (diffx * diffx + diffy * diffy <= this.range * this.range);
  }

  angleToOther(obj) {
    return Math.atan2(obj.y, obj.x) * 180 / Math.PI;
  }

  beforeStep(state) {
    var numLeft = 0;
    var numRight = 0;
    state.objects.map((obj) => {
      if (obj.id === this.id) {
        return;
      }
      if (this.inRange(obj)) {
        if (this.angleToOther(obj) - this.dir <= 180) {
          numLeft += 1;
        } else {
          numRight += 1;
        }
      }
    });
    var totalN = (numRight + numLeft);
    var turnDir = Math.sign(numLeft - numRight);
    this.dir = (this.dir + this.alpha + (this.beta * totalN * turnDir)) % 360;
    this.color = this.getColor(totalN);
  }

  step(state) {
    this.moveInDir();
  }

  moveInDir() {
    var radDir = this.dir / 180 * Math.PI;
    this.x += Math.cos(radDir)*this.speed;
    this.y += Math.sin(radDir)*this.speed;
    while (this.x < 0) {
      this.x += this.boardWidth;
    } 
    while (this.x >= this.boardWidth) {
      this.x -= this.boardWidth;
    }
    while (this.y < 0) {
      this.y += this.boardHeight;
    }
    while (this.y >= this.boardHeight) {
      this.y -= this.boardHeight;
    }
  }
}