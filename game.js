(function () {
  'use strict';

  // ---------- 画布与常量 ----------
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const W = 800;
  const H = 480;
  const GROUND_Y = 380;        // 角色脚底所在的地面线
  const RUN_SPEED = 260;       // 助跑速度 px/s
  const GRAVITY = 1500;        // 重力 px/s^2
  const JUMP_V0 = 660;         // 起跳初速度（向上）
  const JUMP_BOOST = 16;       // 每关起跳增强，让难度曲线更平缓
  const BAR_X = 520;           // 横杆中心 x
  const BAR_W = 54;            // 横杆宽度
  const BAR_THICK = 8;         // 横杆厚度
  const HINIT = 70;            // 初始横杆高度
  const HSTEP = 12;            // 每关升高
  const START_X = 80;          // 角色起点

  const STATE = {
    MENU: 'MENU',
    RUNNING: 'RUNNING',
    JUMPING: 'JUMPING',
    CLEAR: 'CLEAR',
    OVER: 'OVER'
  };

  // ---------- 游戏状态 ----------
  let state = STATE.MENU;
  let level = 1;
  let score = 0;
  let best = 0;
  let clearTimer = 0;
  let flashTimer = 0;
  let time = 0; // 全局时间，用于装饰动画

  const runner = { x: START_X, y: GROUND_Y, w: 22, h: 34, vy: 0, frame: 0 };
  const bar = { x: BAR_X, height: HINIT };

  try { best = parseInt(localStorage.getItem('highJumpBest') || '0', 10) || 0; } catch (e) { best = 0; }

  // ---------- 音效（WebAudio，无外部文件） ----------
  let audioCtx = null;
  function beep(type) {
    try {
      if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audioCtx = new AC();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'square';

      if (type === 'jump') {
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.12);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now); osc.stop(now + 0.15);
      } else if (type === 'clear') {
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.setValueAtTime(880, now + 0.09);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
        osc.start(now); osc.stop(now + 0.27);
      } else if (type === 'fail') {
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
        osc.start(now); osc.stop(now + 0.35);
      }
    } catch (e) { /* 音效失败不影响游戏 */ }
  }

  // ---------- 状态切换 ----------
  function setState(next) { state = next; }

  function resetRunner() {
    runner.x = START_X;
    runner.y = GROUND_Y;
    runner.vy = 0;
    runner.frame = 0;
  }

  function resetGame() {
    level = 1;
    score = 0;
    bar.height = HINIT;
    flashTimer = 0;
    resetRunner();
    setState(STATE.RUNNING);
  }

  function handleAction() {
    switch (state) {
      case STATE.MENU:
      case STATE.OVER:
        resetGame();
        break;
      case STATE.RUNNING:
        runner.vy = -(JUMP_V0 + (level - 1) * JUMP_BOOST);
        setState(STATE.JUMPING);
        beep('jump');
        break;
      case STATE.JUMPING:
      case STATE.CLEAR:
      default:
        break;
    }
  }

  // ---------- 更新逻辑 ----------
  function update(dt) {
    time += dt;
    if (flashTimer > 0) flashTimer -= dt;

    const barLeft = bar.x - BAR_W / 2;
    const barRight = bar.x + BAR_W / 2;
    const barTop = GROUND_Y - bar.height;

    if (state === STATE.RUNNING) {
      runner.x += RUN_SPEED * dt;
      runner.frame += dt * 12;

      // 没起跳就撞上支架
      if (runner.x + runner.w / 2 >= barLeft) {
        fail();
      }
    } else if (state === STATE.JUMPING) {
      runner.vy += GRAVITY * dt;
      runner.y += runner.vy * dt;
      runner.x += RUN_SPEED * dt;

      const overlapX =
        runner.x + runner.w / 2 > barLeft &&
        runner.x - runner.w / 2 < barRight;
      const overlapY =
        (runner.y - runner.h) < barTop + BAR_THICK &&
        runner.y > barTop - BAR_THICK;

      if (overlapX && overlapY) {
        // 撞杆
        fail();
      } else if (runner.x - runner.w / 2 > barRight) {
        // 完全越过横杆 → 过关
        score++;
        if (score > best) {
          best = score;
          try { localStorage.setItem('highJumpBest', String(best)); } catch (e) { /* 忽略 */ }
        }
        clearTimer = 0.9;
        flashTimer = 0.35;
        beep('clear');
        setState(STATE.CLEAR);
      } else if (runner.y >= GROUND_Y) {
        // 落地仍未越过
        runner.y = GROUND_Y;
        fail();
      }
    } else if (state === STATE.CLEAR) {
      clearTimer -= dt;
      if (clearTimer <= 0) {
        level++;
        bar.height = HINIT + (level - 1) * HSTEP;
        resetRunner();
        setState(STATE.RUNNING);
      }
    }
  }

  function fail() {
    flashTimer = 0.3;
    beep('fail');
    setState(STATE.OVER);
  }

  // ---------- 绘制 ----------
  function px(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawCloud(x, y) {
    const c = 'rgba(255,255,255,0.92)';
    px(x, y + 8, 56, 14, c);
    px(x + 12, y, 30, 16, c);
    px(x - 10, y + 12, 20, 10, c);
    px(x + 4, y + 22, 56, 6, 'rgba(210,225,235,0.8)');
  }

  function wrapX(value, span) {
    return ((value % span) + span) % span;
  }

  function drawBackground() {
    // 天空
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#7ec8f2');
    sky.addColorStop(1, '#cdeafd');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, GROUND_Y);

    // 太阳
    px(690, 50, 54, 54, '#ffe066');
    px(682, 58, 70, 38, '#ffe066');
    px(698, 42, 38, 70, '#ffe066');

    // 云（缓慢飘动）
    const cloudSpan = W + 160;
    drawCloud(wrapX(120 + time * 12, cloudSpan) - 80, 70);
    drawCloud(wrapX(420 + time * 8, cloudSpan) - 80, 130);
    drawCloud(wrapX(700 - time * 6, cloudSpan) - 80, 55);

    // 远山
    ctx.fillStyle = '#8fbf8a';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(150, 250); ctx.lineTo(300, GROUND_Y);
    ctx.lineTo(430, 275); ctx.lineTo(620, GROUND_Y);
    ctx.lineTo(700, 235); ctx.lineTo(800, GROUND_Y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#79ad75';
    ctx.beginPath();
    ctx.moveTo(200, GROUND_Y);
    ctx.lineTo(360, 285); ctx.lineTo(520, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    // 地面
    px(0, GROUND_Y, W, H - GROUND_Y, '#8b5a2b');
    px(0, GROUND_Y, W, 12, '#5fa84a');
    px(0, GROUND_Y + 12, W, 4, '#4a8c3a');
    for (let i = 0; i < 40; i++) {
      const gx = (i * 53 + 17) % W;
      const gy = GROUND_Y + 20 + (i * 31) % (H - GROUND_Y - 24);
      px(gx, gy, 6, 4, i % 2 ? '#7a4d26' : '#9c6736');
    }
    // 跑道
    px(0, GROUND_Y - 6, W, 6, '#c98b52');
    for (let i = 0; i < 12; i++) {
      px(i * 70 + (time * 40) % 70, GROUND_Y - 4, 34, 2, '#e6b783');
    }
  }

  function drawBar() {
    const left = bar.x - BAR_W / 2;
    const right = bar.x + BAR_W / 2;
    const top = GROUND_Y - bar.height;

    // 两根立柱（带高光）
    px(left - 6, top, 8, GROUND_Y - top, '#b9c0c8');
    px(left - 6, top, 3, GROUND_Y - top, '#eceff2');
    px(right - 2, top, 8, GROUND_Y - top, '#b9c0c8');
    px(right - 2, top, 3, GROUND_Y - top, '#eceff2');
    // 立柱底座
    px(left - 12, GROUND_Y - 6, 20, 6, '#6b7280');
    px(right - 8, GROUND_Y - 6, 20, 6, '#6b7280');
    // 横杆（红白相间）
    const seg = 10;
    for (let x = left; x < right; x += seg) {
      const w = Math.min(seg, right - x);
      px(x, top - BAR_THICK / 2, w, BAR_THICK, (Math.floor((x - left) / seg) % 2 === 0) ? '#e5484d' : '#f5f5f5');
    }
  }

  function drawRunner() {
    const x = Math.round(runner.x);
    const feet = Math.round(runner.y);
    const jumping = state === STATE.JUMPING;
    const skin = '#ffd7a8';
    const shirt = '#3b82f6';
    const shorts = '#ef4444';
    const shoe = '#1f2937';
    const outline = '#222';

    // 头
    px(x - 7, feet - 34, 14, 13, skin);
    px(x - 8, feet - 35, 16, 3, outline);   // 头发
    px(x + 2, feet - 30, 2, 2, outline);    // 眼睛
    // 身体
    px(x - 6, feet - 21, 12, 12, shirt);
    // 短裤
    px(x - 6, feet - 10, 12, 5, shorts);

    if (jumping) {
      // 收腿 + 上举手臂
      px(x - 10, feet - 22, 4, 8, skin);
      px(x + 6, feet - 22, 4, 8, skin);
      px(x - 5, feet - 5, 4, 5, skin);
      px(x + 1, feet - 5, 4, 5, skin);
      px(x - 6, feet - 1, 6, 3, shoe);
      px(x + 1, feet - 1, 6, 3, shoe);
    } else {
      // 跑步交替腿
      const f = Math.floor(runner.frame) % 2;
      if (f === 0) {
        px(x - 6, feet - 10, 4, 10, skin);
        px(x + 2, feet - 10, 4, 7, skin);
        px(x - 7, feet - 1, 7, 3, shoe);
        px(x + 2, feet - 4, 7, 3, shoe);
      } else {
        px(x - 6, feet - 10, 4, 7, skin);
        px(x + 2, feet - 10, 4, 10, skin);
        px(x - 7, feet - 4, 7, 3, shoe);
        px(x + 2, feet - 1, 7, 3, shoe);
      }
      // 摆臂
      px(x - 11, feet - 20 + (f ? 4 : 0), 5, 4, skin);
      px(x + 6, feet - 20 + (f ? 0 : 4), 5, 4, skin);
    }
  }

  function drawHUD() {
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0d1620';
    ctx.fillText(`LEVEL ${level}`, 22, 36);
    ctx.fillText(`SCORE ${score}`, 22, 62);
    ctx.fillStyle = '#ffd166';
    ctx.fillText(`LEVEL ${level}`, 20, 34);
    ctx.fillText(`SCORE ${score}`, 20, 60);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0d1620';
    ctx.fillText(`BEST ${best}`, W - 22, 36);
    ctx.fillStyle = '#fff';
    ctx.fillText(`BEST ${best}`, W - 24, 34);
  }

  function overlayBox(title, subtitle, color) {
    ctx.fillStyle = 'rgba(8,14,22,0.62)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = 'bold 54px "Courier New", monospace';
    ctx.fillStyle = '#0d1620';
    ctx.fillText(title, W / 2 + 3, H / 2 - 6 + 3);
    ctx.fillStyle = color;
    ctx.fillText(title, W / 2, H / 2 - 6);
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillStyle = '#e8f0f7';
    ctx.fillText(subtitle, W / 2, H / 2 + 40);
  }

  function draw() {
    drawBackground();
    drawBar();
    drawRunner();
    drawHUD();

    if (state === STATE.MENU) {
      overlayBox('跳高小游戏', '按空格 / 点击画面 开始', '#ffd166');
    } else if (state === STATE.OVER) {
      overlayBox('GAME OVER', `得分 ${score} · 按空格 / 点击 重来`, '#ff6b6b');
    } else if (state === STATE.CLEAR) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 44px "Courier New", monospace';
      ctx.fillStyle = '#0d1620';
      ctx.fillText('NICE!', W / 2 + 3, 150 + 3);
      ctx.fillStyle = '#7ee081';
      ctx.fillText('NICE!', W / 2, 150);
    }

    if (flashTimer > 0) {
      ctx.fillStyle = `rgba(255,255,255,${flashTimer * 0.5})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ---------- 主循环与输入 ----------
  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') {
      e.preventDefault();
      if (!e.repeat) handleAction();
    }
  });
  canvas.addEventListener('mousedown', handleAction);
  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    handleAction();
  }, { passive: false });
})();
