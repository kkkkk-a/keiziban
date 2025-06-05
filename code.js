const templates = {
    minimum:`<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
    </head>
    <body>
        
    </body>
    </html>`,
    basic: `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>基本テンプレート</title>
  <style>
    body { font-family: sans-serif; line-height: 1.6; padding: 20px; }
    header, footer { background-color: #f0f0f0; padding: 10px; text-align: center; }
  </style>
</head>
<body>
  <header>
    <h1>ウェブページタイトル</h1>
  </header>
  <main>
    <h2>主要コンテンツ</h2>
    <p>これは基本的なHTMLページの構造です。</p>
  </main>
  <footer>
    <p>© 2024 あなたの名前</p>
  </footer>
</body>
</html>`,

    bootstrap: `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bootstrap活用テンプレート</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <style> body { padding-top: 56px; /* Navbarの高さ分 */ } </style>
</head>
<body>
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
    <div class="container-fluid">
      <a class="navbar-brand" href="#">Bootstrapサイト</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav">
          <li class="nav-item"><a class="nav-link active" aria-current="page" href="#">ホーム</a></li>
          <li class="nav-item"><a class="nav-link" href="#">特徴</a></li>
          <li class="nav-item"><a class="nav-link" href="#">価格</a></li>
        </ul>
      </div>
    </div>
  </nav>

  <div class="container mt-5">
    <div class="p-5 mb-4 bg-light rounded-3">
      <div class="container-fluid py-5">
        <h1 class="display-5 fw-bold">ようこそ！</h1>
        <p class="col-md-8 fs-4">このテンプレートはBootstrap 5の主要なコンポーネントを使用しています。</p>
        <button class="btn btn-primary btn-lg" type="button">もっと詳しく</button>
      </div>
    </div>

    <div class="row align-items-md-stretch">
      <div class="col-md-6">
        <div class="h-100 p-5 text-white bg-dark rounded-3">
          <h2>カード1</h2>
          <p>これはBootstrapのカードコンポーネントの例です。グリッドシステムを使って配置されています。</p>
          <button class="btn btn-outline-light" type="button">詳細</button>
        </div>
      </div>
      <div class="col-md-6">
        <div class="h-100 p-5 bg-light border rounded-3">
          <h2>カード2</h2>
          <p>レスポンシブデザインに対応しており、様々な画面サイズで適切に表示されます。</p>
          <button class="btn btn-outline-secondary" type="button">詳細</button>
        </div>
      </div>
    </div>

    <footer class="pt-3 mt-4 text-muted border-top">
      © 2024
    </footer>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`,

    tailwind: `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tailwind CSS テンプレート</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 text-gray-800">
  <header class="bg-blue-600 text-white p-4 shadow-md">
    <div class="container mx-auto flex justify-between items-center">
      <h1 class="text-2xl font-bold">Tailwindサイト</h1>
      <nav>
        <a href="#" class="px-3 py-2 hover:bg-blue-700 rounded">ホーム</a>
        <a href="#" class="px-3 py-2 hover:bg-blue-700 rounded">アバウト</a>
        <a href="#" class="px-3 py-2 hover:bg-blue-700 rounded">コンタクト</a>
      </nav>
    </div>
  </header>

  <main class="container mx-auto p-6">
    <section class="bg-white p-6 rounded-lg shadow-lg mb-6">
      <h2 class="text-xl font-semibold mb-3 text-blue-700">ユーティリティファースト！</h2>
      <p>Tailwind CSSは、HTML内で直接スタイルを構築するためのユーティリティクラスを提供します。</p>
      <button class="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
        クリックミー
      </button>
    </section>

    <div class="grid md:grid-cols-2 gap-6">
        <div class="bg-white p-6 rounded-lg shadow">要素1</div>
        <div class="bg-white p-6 rounded-lg shadow">要素2</div>
    </div>
  </main>

  <footer class="bg-gray-800 text-gray-300 p-4 text-center mt-8">
    <p>© 2024 Tailwind CSS Example</p>
  </footer>
</body>
</html>`,

    simpleLayout: `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>シンプルレイアウト (Flexbox)</title>
  <style>
    body { margin: 0; font-family: sans-serif; }
    .container { display: flex; flex-direction: column; min-height: 100vh; }
    header { background: #333; color: white; padding: 1em; text-align: center; }
    .main-content { display: flex; flex: 1; }
    nav { background: #f4f4f4; padding: 1em; flex: 0 0 200px; /* 固定幅サイドバー */ }
    nav ul { list-style: none; padding: 0; }
    nav ul li a { text-decoration: none; color: #333; display: block; padding: 0.5em 0; }
    article { padding: 1em; flex: 1; /* 残りのスペースを埋めるメインコンテンツ */ }
    footer { background: #333; color: white; padding: 1em; text-align: center; }
    /* レスポンシブ対応 (例) */
    @media (max-width: 768px) {
      .main-content { flex-direction: column; }
      nav { flex-basis: auto; /* 幅を自動に */ }
    }
  </style>
</head>
<body>
  <div class="container">
    <header><h1>ヘッダー</h1></header>
    <div class="main-content">
      <nav>
        <ul>
          <li><a href="#">メニュー1</a></li>
          <li><a href="#">メニュー2</a></li>
          <li><a href="#">メニュー3</a></li>
        </ul>
      </nav>
      <article>
        <h2>メインコンテンツエリア</h2>
        <p>ここに主要な内容が入ります。</p>
      </article>
    </div>
    <footer><p>フッター</p></footer>
  </div>
</body>
</html>`,

    interactiveJs: `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JavaScriptインタラクション</title>
  <style>
    body { font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; margin-top: 50px; }
    button { padding: 10px 20px; font-size: 16px; cursor: pointer; margin-bottom: 20px; }
    #messageArea { padding: 15px; border: 1px solid #ccc; min-height: 50px; width: 300px; text-align: center; }
    .hover-box { width: 100px; height: 100px; background-color: lightblue; margin-top: 20px; display: flex; align-items: center; justify-content: center; transition: background-color 0.3s, transform 0.3s; }
  </style>
</head>
<body>
  <button id="myButton">クリックしてね</button>
  <div id="messageArea">ここにメッセージが表示されます</div>
  <div class="hover-box" id="hoverEffectBox">ホバーしてね</div>

  <script>
    const button = document.getElementById('myButton');
    const messageArea = document.getElementById('messageArea');
    let clickCount = 0;

    button.addEventListener('click', function() {
      clickCount++;
      messageArea.textContent = \`ボタンが ${'${clickCount}'} 回クリックされました！\`;
      messageArea.style.backgroundColor = (clickCount % 2 === 0) ? '#e0ffe0' : '#ffe0e0';
    });

    const hoverBox = document.getElementById('hoverEffectBox');
    hoverBox.addEventListener('mouseover', function() {
      hoverBox.style.backgroundColor = 'dodgerblue';
      hoverBox.style.transform = 'scale(1.1)';
      hoverBox.textContent = 'ホバー中！';
    });
    hoverBox.addEventListener('mouseout', function() {
      hoverBox.style.backgroundColor = 'lightblue';
      hoverBox.style.transform = 'scale(1)';
      hoverBox.textContent = 'ホバーしてね';
    });
  </script>
</body>
</html>`,
animationJs:`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JavaScript 面白コード - 絵文字リアクション！</title>
    <style>
        /* PyScript版と同じCSSを使用 */
        body {
            font-family: 'Arial', sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-top: 30px;
            background-color: #f0f0f0;
            color: #333;
        }
        h1 {
            color: #5cb85c; /* JavaScriptっぽい緑色にしてみる */
        }
        #click-area {
            width: 500px;
            height: 400px;
            border: 3px dashed #5cb85c;
            border-radius: 10px;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 1.5em;
            color: #aaa;
            position: relative;
            cursor: pointer;
            user-select: none;
            overflow: hidden;
            background-color: #fff;
        }
        .emoji-span {
            position: absolute;
            font-size: 2.5em;
            animation: pop-and-fade 1.8s ease-out forwards;
            pointer-events: none;
        }

        @keyframes pop-and-fade {
            0% { transform: scale(0.3) translateY(0); opacity: 0; }
            30% { transform: scale(1.1) translateY(-10px); opacity: 1; }
            60% { transform: scale(1) translateY(-15px); opacity: 1; }
            100% { transform: scale(0.8) translateY(-50px); opacity: 0; }
        }
        button {
            margin-top: 20px;
            padding: 12px 25px;
            font-size: 1.1em;
            color: white;
            background-color: #5cb85c;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s ease;
        }
        button:hover {
            background-color: #4cae4c;
        }
    </style>
</head>
<body>
    <h1>クリックすると絵文字が飛び出すよ！ (JavaScript版)</h1>
    <div id="click-area">ここをクリック！</div>
    <button id="reset-button">リセット</button>

    <script>
        const clickArea = document.getElementById("click-area");
        const resetButton = document.getElementById("reset-button");
        const emojis = ["😀", "😂", "😍", "🥳", "🤯", "🚀", "🎉", "🌟", "💖", "💯", "🦄", "🍕", "🎈", "✨"];

        function showEmoji(event) {
            const x = event.offsetX - 20 + "px";
            const y = event.offsetY - 20 + "px";

            const emojiChar = emojis[Math.floor(Math.random() * emojis.length)];

            const emojiSpan = document.createElement("span");
            emojiSpan.innerText = emojiChar;
            emojiSpan.classList.add("emoji-span");

            emojiSpan.style.left = x; // 20pxは絵文字サイズのおおよその半分
            emojiSpan.style.top = y;

            clickArea.appendChild(emojiSpan);

            setTimeout(() => {
                if (emojiSpan.parentElement) {
                    emojiSpan.remove();
                }
            }, 1800); // CSSアニメーションの期間と合わせる
        }

        function resetEmojis() {
            const currentEmojis = clickArea.querySelectorAll(".emoji-span");
            currentEmojis.forEach(el => el.remove());
        }

        clickArea.addEventListener("click", showEmoji);
        resetButton.addEventListener("click", resetEmojis);

        console.log("JavaScriptが読み込まれ、インタラクションの準備ができました！");
    </script>
</body>
</html>`,
    cssAnimation: `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CSS アニメーション</title>
  <style>
    body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f0f0; }
    .box {
      width: 100px;
      height: 100px;
      background-color: tomato;
      animation-name: spinAndGrow;
      animation-duration: 4s;
      animation-timing-function: ease-in-out;
      animation-iteration-count: infinite;
      animation-direction: alternate;
    }
    @keyframes spinAndGrow {
      0% { transform: rotate(0deg) scale(1); border-radius: 0%; }
      50% { transform: rotate(180deg) scale(1.5); background-color: gold; border-radius: 50%; }
      100% { transform: rotate(360deg) scale(1); background-color: dodgerblue; border-radius: 0%; }
    }
  </style>
</head>
<body>
  <div class="box"></div>
</body>
</html>`,

    formExample: `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>フォームの例</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background-color: #f9f9f9; }
    .form-container { max-width: 500px; margin: auto; background-color: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    label { display: block; margin-bottom: 8px; font-weight: bold; color: #333; }
    input[type="text"], input[type="email"], input[type="password"], textarea, select {
      width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;
    }
    textarea { resize: vertical; min-height: 80px; }
    .radio-group label, .checkbox-group label { font-weight: normal; margin-right: 15px; }
    input[type="radio"], input[type="checkbox"] { margin-right: 5px; }
    button[type="submit"] {
      background-color: #007bff; color: white; padding: 12px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; transition: background-color 0.2s;
    }
    button[type="submit"]:hover { background-color: #0056b3; }
  </style>
</head>
<body>
  <div class="form-container">
    <h2>お問い合わせフォーム</h2>
    <form action="#" method="post" id="sampleForm">
      <div>
        <label for="name">お名前:</label>
        <input type="text" id="name" name="name" required>
      </div>
      <div>
        <label for="email">メールアドレス:</label>
        <input type="email" id="email" name="email" required>
      </div>
      <div class="radio-group">
        <p style="font-weight:bold; margin-bottom: 8px;">好きな果物:</p>
        <input type="radio" id="apple" name="fruit" value="apple"> <label for="apple">りんご</label>
        <input type="radio" id="banana" name="fruit" value="banana"> <label for="banana">バナナ</label>
        <input type="radio" id="orange" name="fruit" value="orange"> <label for="orange">オレンジ</label>
      </div>
      <div class="checkbox-group" style="margin-top:15px;">
        <p style="font-weight:bold; margin-bottom: 8px;">興味のある分野 (複数選択可):</p>
        <input type="checkbox" id="tech" name="interest" value="tech"> <label for="tech">テクノロジー</label>
        <input type="checkbox" id="art" name="interest" value="art"> <label for="art">アート</label>
        <input type="checkbox" id="sports" name="interest" value="sports"> <label for="sports">スポーツ</label>
      </div>
      <div>
        <label for="country" style="margin-top:15px;">国:</label>
        <select id="country" name="country">
          <option value="japan">日本</option>
          <option value="usa">アメリカ</option>
          <option value="other">その他</option>
        </select>
      </div>
      <div>
        <label for="message">メッセージ:</label>
        <textarea id="message" name="message" rows="4" required></textarea>
      </div>
      <button type="submit">送信</button>
    </form>
  </div>
  <script>
    // 簡単なフォーム送信のハンドリング (実際にはサーバーに送信する)
    document.getElementById('sampleForm').addEventListener('submit', function(event) {
      event.preventDefault(); // 実際の送信を防ぐ
      alert('フォームが送信されました！ (実際には送信されません)');
      // ここでフォームデータを取得する例:
      // const formData = new FormData(this);
      // for (const [key, value] of formData.entries()) {
      //   console.log(\`\${key}: \${value}\`);
      // }
    });
  </script>
</body>
</html>`,

    pyscriptCalculator: `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>PyScript 電卓</title>
  <link rel="stylesheet" href="https://pyscript.net/releases/2025.5.1/core.css" />
  <script type="module" src="https://pyscript.net/releases/2025.5.1/core.js"></script>
  <style>
    body {
      font-family: sans-serif;
      text-align: center;
      padding-top: 30px;
      background: #f9f9f9;
    }
    .calculator {
      display: inline-grid;
      grid-template-columns: repeat(4, 80px);
      gap: 10px;
      background: #222;
      padding: 20px;
      border-radius: 12px;
    }
    .display {
      grid-column: span 4;
      height: 60px;
      font-size: 2em;
      text-align: right;
      padding: 10px;
      background: #fff;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    button {
      font-size: 1.5em;
      padding: 10px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }
    .num { background: #eee; }
    .op { background: #f39c12; color: white; }
    .eq { background: #27ae60; color: white; grid-column: span 2; }
    .clear { background: #e74c3c; color: white; }
  </style>
</head>
<body>

<h1>🧮 PyScript 本格電卓</h1>

<div class="calculator">
  <div id="display" class="display">0</div>

  <button class="clear" id="clear">C</button>
  <button class="op" data-value="/">÷</button>
  <button class="op" data-value="*">×</button>
  <button class="op" data-value="-">−</button>

  <button class="num" data-value="7">7</button>
  <button class="num" data-value="8">8</button>
  <button class="num" data-value="9">9</button>
  <button class="op" data-value="+">+</button>

  <button class="num" data-value="4">4</button>
  <button class="num" data-value="5">5</button>
  <button class="num" data-value="6">6</button>
  <button class="eq" id="equals">=</button>

  <button class="num" data-value="1">1</button>
  <button class="num" data-value="2">2</button>
  <button class="num" data-value="3">3</button>
  <button class="num" data-value="0" style="grid-column: span 2;">0</button>
  <button class="num" data-value=".">.</button>
</div>

<py-script>
from js import document
from pyodide.ffi import create_proxy

# 内部で保持する数式
expression = ""

def update_display(text):
    document.getElementById("display").innerText = text

def on_button_click(event):
    global expression
    value = event.target.getAttribute("data-value")
    if value:
        if expression == "0" and value.isnumeric():
            expression = value
        else:
            expression += value
        update_display(expression)

def on_clear(event=None):
    global expression
    expression = ""
    update_display("0")

def on_equals(event=None):
    global expression
    try:
        result = eval(expression)
        update_display(str(result))
        expression = str(result)
    except Exception as e:
        update_display("エラー")
        expression = ""

# イベント登録
for btn in document.querySelectorAll("button.num, button.op"):
    btn.addEventListener("click", create_proxy(on_button_click))

document.getElementById("clear").addEventListener("click", create_proxy(on_clear))
document.getElementById("equals").addEventListener("click", create_proxy(on_equals))
</py-script>

</body>
</html>
`,

    pyscriptBasic: `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>PyScriptテスト</title>
  <link rel="stylesheet" href="https://pyscript.net/releases/2025.5.1/core.css" />
  <script type="module" src="https://pyscript.net/releases/2025.5.1/core.js"></script>
</head>
<body>

  <h1>PyScriptへようこそ</h1>
  <p id="output">ここにメッセージが出ます</p>
  <button id="my-button">クリックしてPython実行</button>

<py-script>
from js import document
from pyodide.ffi import create_proxy

def say_hello(event=None):
    document.getElementById("output").innerText = "こんにちは！Pythonがブラウザで動いています。"

proxy = create_proxy(say_hello)
document.getElementById("my-button").addEventListener("click", proxy)
</py-script>

</body>
</html>
`,

    mediaElements: `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>メディア要素テンプレート</title>
    <style>
        body { font-family: sans-serif; padding: 20px; }
        img, audio, video { max-width: 100%; display: block; margin-bottom: 20px; border: 1px solid #eee; }
        figure { margin: 0 0 20px 0; padding: 10px; background-color: #f9f9f9; border: 1px solid #ddd;}
        figcaption { font-style: italic; text-align: center; margin-top: 5px; color: #555;}
    </style>
</head>
<body>
    <h1>メディア要素の表示</h1>

    <h2>画像 (img)</h2>
    <figure>
      <img src="https://via.placeholder.com/600x300.png?text=サンプル画像" alt="サンプル画像の説明">
      <figcaption>これはサンプル画像のキャプションです。</figcaption>
    </figure>

    <h2>音声 (audio)</h2>
    <figure>
      <!-- 注意: 有効な音声ファイル(例: .mp3, .ogg, .wav)のURLに置き換えてください -->
      <audio controls src="https://www.w3schools.com/html/horse.ogg">
          お使いのブラウザはaudio要素をサポートしていません。
      </audio>
      <figcaption>これはサンプル音声のキャプションです。</figcaption>
    </figure>

    <h2>動画 (video)</h2>
    <figure>
      <!-- 注意: 有効な動画ファイル(例: .mp4, .webm, .ogv)のURLに置き換えてください -->
      <video controls width="600">
          <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4">
          <source src="https://www.w3schools.com/html/mov_bbb.ogg" type="video/ogg">
          お使いのブラウザはvideo要素をサポートしていません。
      </video>
      <figcaption>これはサンプル動画のキャプションです。</figcaption>
    </figure>
</body>
</html>`
};

// Monaco 設定
require.config({ paths: { 'vs': 'https://unpkg.com/monaco-editor@0.52.2/min/vs' } });

let editor;
let codeOn=false

function initializeMonacoEditor() {
    if (typeof require !== 'function') {
        console.error("Monaco loader (require) is not available. Retrying in 100ms.");
        setTimeout(initializeMonacoEditor, 100); // 少し待って再試行
        return;
    }

    require.config({ paths: { 'vs': 'https://unpkg.com/monaco-editor@0.52.2/min/vs' } });

    require(['vs/editor/editor.main'], function () {
        const editorContainer = document.getElementById('code-container');
        if (!editorContainer) {
            console.error("Monaco editor container 'code-container' not found.");
            return;
        }
if(codeOn==true){
        // ★ monacoEditorInstance にエディタインスタンスを代入
        monacoEditorInstance = monaco.editor.create(editorContainer, {
            value: templates.minimum, // 初期値
            language: 'html',
            theme: 'vs-dark',
            automaticLayout: false // コンテナのサイズ変更時にエディタのレイアウトを自動調整
        });

        // 初期プレビュー表示
        updatePreview(monacoEditorInstance.getValue()); // ★ monacoEditorInstance を使用

        // エディタ内容が変更されたらプレビュー更新
        monacoEditorInstance.onDidChangeModelContent(() => { // ★ monacoEditorInstance を使用
            updatePreview(monacoEditorInstance.getValue()); // ★ monacoEditorInstance を使用
        });
      }

        // セレクト変更時の処理
        const templateSelect = document.getElementById('code-templateSelect');
        if (templateSelect) {
            templateSelect.addEventListener('change', function () {
                const templateKey = this.value;
                if (templates[templateKey]) {
                    const newCode = templates[templateKey];
                    monacoEditorInstance.setValue(newCode); // ★ monacoEditorInstance を使用
                    // setValue後にプレビューを更新 (setValueはonDidChangeModelContentをトリガーしない場合があるため)
                    // updatePreview(newCode); // onDidChangeModelContent で処理されるはずだが念のため
                }
            });
        } else {
            console.error("Template select element 'code-templateSelect' not found.");
        }
    });
}
initializeMonacoEditor()


// プレビュー更新関数
function updatePreview(html) {
    const iframe = document.getElementById('code-preview');
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
}


// Monaco Editor のインスタンスを保持するグローバル変数
// この変数は、Monaco Editorの初期化時に代入される想定です。
// 例: require(['vs/editor/editor.main'], function() { monacoEditorInstance = monaco.editor.create(...); });
let monacoEditorInstance;

// Quill エディタのインスタンスは window.quillInstance に格納されている前提

/**
 * HTMLコンテンツを安全にエスケープする関数 (主に srcdoc の属性値用)
 * @param {string} unsafe - エスケープ対象の文字列
 * @returns {string} エスケープされた文字列
 */

/**
 * Monaco Editorの現在の内容をQuillエディタにiframeとして埋め込む関数
 */
function codeEmbedded() {

    const htmlContent = monacoEditorInstance.getValue();

    if (!htmlContent || htmlContent.trim() === "") {
        alert("埋め込むHTMLコードがありません。");
        return;
    }

    const quill = window.quillInstance;
    const range = quill.getSelection(true);
    const insertionIndex = range ? range.index : quill.getLength();

    // 挿入するiframeの属性をオブジェクトで渡す
    const iframeData = {
        srcdoc: htmlContent, // ★ HTMLコンテンツを直接渡す
        width: "100%",
        height: "300px",
        sandbox: "allow-scripts allow-modals allow-pointer-lock",
        style: "border:1px solid #ccc; min-width: 200px; min-height: 100px; resize: both; overflow: auto;",
        title: "埋め込みコンテンツ"
    };

    console.log("4. Attempting to insert GenericIframeBlot into Quill at index:", insertionIndex, "with data:", iframeData);
    // ★ insertEmbed を使ってカスタムBlotを挿入
    quill.insertEmbed(insertionIndex, GenericIframeBlot.blotName, iframeData, Quill.sources.USER);
    console.log("5. GenericIframeBlot insertion attempted.");

    setTimeout(() => {
        console.log("6. Quill editor innerHTML after insertion attempt:", quill.root.innerHTML);
    }, 100);

    quill.setSelection(insertionIndex + 1, 0, Quill.sources.USER); // Embedの長さは1
    quill.focus();
    codeDisplay();
}
