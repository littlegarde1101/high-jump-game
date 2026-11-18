# 跳高小游戏 · High Jump

一个用纯 HTML / CSS / JavaScript（Canvas 2D）编写的横版助跑跳高小游戏，像素卡通风，无任何外部依赖。

## 玩法

- 角色会自动助跑，接近横杆时按 **空格键** 或 **点击 / 触摸画面** 起跳。
- 起跳时机很关键：太早会提前落地，太晚会撞上横杆。
- 每成功越过一次横杆，得分 +1、关卡 +1，横杆也会升高 12px。
- 撞杆或落地未越过即游戏结束，按空格 / 点击可以重新开始。
- 历史最高分保存在浏览器本地（localStorage）。

## 本地运行

直接用浏览器打开 `index.html` 即可游玩，无需安装任何东西、无需联网。

如果想用本地服务器打开（可选）：

```bash
python -m http.server 8000
# 然后访问 http://localhost:8000
```

## 文件说明

- `index.html` — 页面骨架
- `style.css` — 页面样式与自适应
- `game.js` — 全部游戏逻辑与像素绘制
- `.nojekyll` — 为将来开启 GitHub Pages 预留

## 在线试玩（GitHub Pages）

游戏地址：**https://littlegarde1101.github.io/high-jump-game/**

本仓库为公开仓库，通过 GitHub Pages 发布。若站点尚未开启，在仓库页面进入
**Settings → Pages**，Source 选择 **Deploy from a branch**，分支选 `main`、
目录选 `/ (root)`，保存即可。首次部署可能需要几十秒到几分钟。

注意：Pages 站点本身是公开可访问的，任何拿到链接的人都能打开——请不要在站点中放入敏感信息。
