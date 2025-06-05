
// DOMが完全に読み込まれてからスクリプトを実行

    let quillInstance; // Quillインスタンスをこのスコープで保持

    // --- Quillのモジュールをインポート ---
    const BlockEmbed = Quill.import('blots/block/embed');
    const Embed = Quill.import('blots/embed');
    const Inline = Quill.import('blots/inline');
    const Font = Quill.import('formats/font'); // Fontを一度だけインポート
    const Block = Quill.import('blots/block'); // ParchmentのBlock Blotを継承

    //HTMLモードのやつ
    class GenericIframeBlot extends BlockEmbed {
        static blotName = 'generic-iframe'; // Blot名 (ユニークに)
        static tagName = 'iframe';         // 生成するDOM要素のタグ名
    
        static create(value) { // value はオブジェクト { srcdoc, width, height, sandbox, style, title } を想定
            let node = super.create(value);
            if (value && typeof value === 'object') {
                if (value.srcdoc) node.setAttribute('srcdoc', value.srcdoc);
                node.setAttribute('width', value.width || '100%');
                node.setAttribute('height', value.height || '300px');
                node.setAttribute('frameborder', value.frameborder || '0');
                if (value.sandbox) node.setAttribute('sandbox', value.sandbox);
                if (value.style) node.style.cssText = value.style; // style属性を直接設定
                if (value.title) node.setAttribute('title', value.title);
                // ここで allowfullscreen などの他の属性も必要に応じて設定可能
                // node.setAttribute('allowfullscreen', true);
            }
            return node;
        }
    
        static value(domNode) {
            // iframeから保存したい情報をオブジェクトとして返す
            return {
                srcdoc: domNode.getAttribute('srcdoc'),
                width: domNode.getAttribute('width'),
                height: domNode.getAttribute('height'),
                frameborder: domNode.getAttribute('frameborder'),
                sandbox: domNode.getAttribute('sandbox'),
                style: domNode.style.cssText,
                title: domNode.getAttribute('title')
            };
        }
    }
    Quill.register(GenericIframeBlot);


    // 1. AudioBlot (音声埋め込み)
    class AudioBlot extends BlockEmbed {
        static blotName = 'audio';
        static tagName = 'div';
        static className = 'ql-audio';

        static create(value) {
            let node = super.create(value);
            node.setAttribute('data-src', value);
            let audioPlayer = document.createElement('audio'); // 変数名変更
            audioPlayer.setAttribute('src', value);
            audioPlayer.setAttribute('controls', true);
            node.appendChild(audioPlayer);
            return node;
        }
        static value(domNode) {
            return domNode.getAttribute('data-src');
        }
    }
    Quill.register(AudioBlot);

    // 2. LetterSpacingBlot (文字間隔)
    class LetterSpacingBlot extends Inline {
        static blotName = 'letterspacing';
        static tagName = 'span';
        static create(value) {
            let node = super.create(value);
            if (value && typeof value === 'string') { // valueが有効な文字列か確認
                node.style.letterSpacing = value;
            }
            return node;
        }
        static formats(domNode) {
            return domNode.style.letterSpacing || undefined;
        }
    }
    Quill.register(LetterSpacingBlot);

    // 3. VideoEmbedBlot (動画iframe埋め込み)
    class VideoEmbedBlot extends BlockEmbed {
        static blotName = 'videoembed';
        static tagName = 'div';
        static className = 'ql-video-embed-wrapper';

        static create(value) { // value は iframe の src URL
            let node = super.create(value);
            node.setAttribute('data-url', value);

            let iframe = document.createElement('iframe');
            iframe.setAttribute('src', value);
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('allowfullscreen', true);
            // CSSでアスペクト比を制御するため、ここではwidth/heightを直接設定しない
            // iframe.style.width = '100%';
            // iframe.style.height = '315px';
            node.appendChild(iframe);
            return node;
        }
        static value(domNode) {
            return domNode.getAttribute('data-url');
        }
    }
    Quill.register(VideoEmbedBlot);





    // 音声ファイル挿入ハンドラ
    function audioHandler() {
        if (!quillInstance) return;
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'audio/*');
        input.click();

        input.onchange = () => {
            const file = input.files[0];
            if (file) {
                if (file.size > 10 * 1024 * 1024) { // 10MB制限の例
                    alert("ファイルサイズが大きすぎます (10MB以下を推奨)。");
                    // return; // 必要であれば処理を中断
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    const dataUrl = e.target.result;
                    const range = quillInstance.getSelection(true);
                    quillInstance.insertEmbed(range.index, AudioBlot.blotName, dataUrl, Quill.sources.USER);
                    quillInstance.setSelection(range.index + 1, Quill.sources.SILENT);
                };
                reader.onerror = (error) => {
                    console.error("File reading error:", error);
                    alert("ファイルの読み込みに失敗しました。");
                };
                reader.readAsDataURL(file);
            }
        };
    }

    class LocalVideoBlot extends BlockEmbed {
        static blotName = 'localvideo';
        static tagName = 'div'; // videoタグをdivでラップ
        static className = 'ql-local-video-wrapper';

        static create(value) { // value は Base64データURL または サーバー上のURL
            let node = super.create(value);
            node.setAttribute('data-src', value);

            let videoPlayer = document.createElement('video');
            videoPlayer.setAttribute('src', value);
            videoPlayer.setAttribute('controls', true); // 再生コントロールを表示
            videoPlayer.setAttribute('width', '100%'); // CSSで制御推奨
            // videoPlayer.setAttribute('height', 'auto'); // CSSでアスペクト比制御推奨
            videoPlayer.style.maxWidth = '100%'; // 親要素を超えないように

            node.appendChild(videoPlayer);
            return node;
        }

        static value(domNode) {
            return domNode.getAttribute('data-src');
        }
    }
    Quill.register(LocalVideoBlot);

    // DOMContentLoaded 内

    // const Embed = Quill.import('blots/embed'); // 既にインポート済みのはず

    class ResultTextBlot extends Embed {
        static blotName = 'resulttext';
        static tagName = 'span';
        static className = 'ql-result-text'; // ベースとなるクラス名

        static create(value) { // value は表示したいテキスト文字列
            let node = super.create(value);
            node.textContent = value;
            node.setAttribute('data-text', value); // 元のテキストを保持
            node.style.userSelect = 'all';

            // ★ 初期状態として 'ql-result-pristine' クラスを追加
            node.classList.add('ql-result-pristine');

            // クリックされたら 'ql-result-pristine' を削除し、プレーンテキストに置き換える
            node.addEventListener('click', function handler() { // 無名関数に名前を付けて解除しやすくする(オプション)
                if (quillInstance && node.parentNode && node.classList.contains('ql-result-pristine')) {
                    const blot = Quill.find(node);
                    if (blot && blot instanceof ResultTextBlot) {
                        const index = quillInstance.getIndex(blot);
                        const textValue = ResultTextBlot.value(node); // staticメソッドなのでクラス名から呼び出し

                        // まず 'ql-result-pristine' を削除してグラデーションを消す
                        // (Quillの操作でBlotが再生成される前に見た目を変えるため)
                        // ただし、このDOM直接操作はQuillの次の更新で上書きされる可能性がある
                        // node.classList.remove('ql-result-pristine');

                        // QuillのAPIを使ってBlotを削除し、プレーンテキストを挿入
                        quillInstance.deleteText(index, 1, Quill.sources.USER); // Embedの長さは1
                        quillInstance.insertText(index, textValue, Quill.sources.USER);
                        quillInstance.setSelection(index + textValue.length, Quill.sources.SILENT);
                        quillInstance.focus();
                    }
                }
                // 一度クリックされたら、再度クリックされても何もしないようにリスナーを削除することも検討できる
                // node.removeEventListener('click', handler); // ただし、Blotが再生成されるとリスナーも再設定される
            });
            return node;
        }

        static value(domNode) {
            return domNode.getAttribute('data-text');
        }

        length() {
            return 1;
        }
    }
    Quill.register(ResultTextBlot);

    class AsciiArtBlockBlot extends Block {
        static blotName = 'aa-block';
        static tagName = 'div';
        static className = 'ql-aa-block'; // CSSで基本スタイルとフォントを指定
        // このBlotは、AAモード時に行を表現するために使われる
        // AsciiArtBlockBlot の定義内 (よりシンプルな formats)
        static formats(domNode) {
            // このBlotが存在するかどうかを返す
            return { [this.blotName]: true };
        }
    }
    Quill.register(AsciiArtBlockBlot);





    // --- 2. ローカル動画挿入ツールバーハンドラ ---
    // (audioHandler と同様の構造)
    function localVideoHandler() {
        if (!quillInstance) return; // quillInstance はDOMContentLoadedスコープで定義されていると仮定

        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'video/*'); // 動画ファイルのみ
        input.click();

        input.onchange = () => {
            const file = input.files[0];
            if (file) {
                // 動画ファイルのサイズは非常に大きくなるため、Base64エンコードは極めて非効率
                // ここでは非常に小さなファイルサイズ制限を設ける (例: 20MB)
                // 実運用ではこの制限をもっと厳しくするか、サーバーアップロード方式にする
                if (file.size > 20 * 1024 * 1024) { // 例: 20MB
                    alert("ファイルサイズが大きすぎます (20MB以下にしてください)。\nBase64エンコードでの動画埋め込みは推奨されません。");
                    return; // 処理を中断
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    const dataUrl = e.target.result; // Base64データURL
                    const range = quillInstance.getSelection(true);
                    quillInstance.insertEmbed(range.index, LocalVideoBlot.blotName, dataUrl, Quill.sources.USER);
                    quillInstance.setSelection(range.index + 1, Quill.sources.SILENT);
                };
                reader.onerror = (error) => {
                    console.error("File reading error:", error);
                    alert("動画ファイルの読み込みに失敗しました。");
                };
                reader.readAsDataURL(file);
            }
        };
    }

    function localTextHandler() {
        if (!quillInstance) return; // quillInstance はDOMContentLoadedスコープで定義されていると仮定
    
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
    
        input.setAttribute('accept', 'text/plain,.txt');
        input.click();
    
        input.onchange = () => {
            const file = input.files[0];
            if (file) {
                // テキストファイルのサイズ制限 (例: 2MB)
                // あまりに大きなテキストファイルを一度にエディタに挿入すると、
                // ブラウザのパフォーマンスに影響を与える可能性があります。
                if (file.size > 2 * 1024 * 1024) { // 2MB
                    alert("ファイルサイズが大きすぎます (2MB以下にしてください)。");
                    return; // 処理を中断
                }
    
                const reader = new FileReader();
    
                reader.onload = (e) => {
                    const textContent = e.target.result; // 読み込まれたテキスト内容
                    const range = quillInstance.getSelection(true); // 現在のカーソル位置を取得 (なければ末尾)
    
                    // テキストとして挿入
                    quillInstance.insertText(range.index, textContent, Quill.sources.USER);
                    // 挿入後、カーソルを挿入したテキストの直後に移動
                    quillInstance.setSelection(range.index + textContent.length, Quill.sources.SILENT);
                };
    
                reader.onerror = (error) => {
                    console.error("File reading error:", error);
                    alert("テキストファイルの読み込みに失敗しました。");
                };
    
                // ファイルをテキストとして読み込む
                // ファイルのエンコーディングによっては文字化けする可能性があるため、
                // 必要であればエンコーディング指定を検討してください (例: reader.readAsText(file, 'UTF-8');)
                reader.readAsText(file);
            }
        };
    }
    


    // --- ツールバーハンドラ定義 ---

    function getYouTubeVideoId(url) {
        if (typeof url !== 'string') return null;

        let videoId = null;
        let match;

        // 1. 標準的な watch URL (PC & モバイル)
        // 例: https://www.youtube.com/watch?v=VIDEO_ID
        // 例: https://m.youtube.com/watch?v=VIDEO_ID
        // 例: https://music.youtube.com/watch?v=VIDEO_ID (YouTube Musicも含む)
        match = url.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/|music\.youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/);
        if (match && match[1]) {
            videoId = match[1];
        }

        // 2. チャンネルページの動画URLなど、より複雑なURL内の 'v=' パラメータ (フォールバック)
        // (上記の正規表現でカバーできていない場合のための追加チェック)
        if (!videoId) {
            match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
            if (match && match[1]) {
                videoId = match[1];
            }
        }

        // 3. YouTube Shorts のパス形式 (例: /shorts/VIDEO_ID)
        // (上記の正規表現でもカバーしようとしているが、念のため個別にもチェック)
        if (!videoId) {
            match = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
            if (match && match[1]) {
                videoId = match[1];
            }
        }


        // 抽出されたIDが11文字であることを最終確認
        if (videoId && videoId.length === 11) {
            return videoId;
        }

        return null;
    }

    // ニコニコ動画 (変更なし)
    function getNicoNicoVideoId(url) {
        const regExp = /(?:nicovideo\.jp\/watch\/|nico\.ms\/)(sm[0-9a-zA-Z]+)/; // ID形式を少し広めに
        const match = url.match(regExp);
        return (match && match[1]) ? match[1] : null;
    }

    // Dailymotion
    function getDailymotionVideoId(url) {
        const regExp = /^.+dailymotion.com\/(video|hub)\/([^_]+)[^#]*(#video=([^_&]+))?/;
        const match = url.match(regExp);
        if (match) {
            return match[4] || match[2];
        }
        // 短縮URL (dai.ly/xxxx) も考慮するなら追加
        // const shortRegExp = /^https?:\/\/dai\.ly\/([a-zA-Z0-9]+)/;
        // const shortMatch = url.match(shortRegExp);
        // if (shortMatch) return shortMatch[1];
        return null;
    }

    // Vimeo
    function getVimeoVideoId(url) {
        const regExp = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/;
        const match = url.match(regExp);
        return (match && match[1]) ? match[1] : null;
    }

    // Bilibili
    function getBilibiliVideoInfo(url) { // BVid, avid, epIDなど複数の形式がある
        let bvIdMatch = url.match(/(?:bilibili\.com\/(?:video\/|s\/video\/)|b23\.tv\/)(BV[1-9A-HJ-NP-Za-km-z]+)/);
        if (bvIdMatch && bvIdMatch[1]) return { type: 'bvid', id: bvIdMatch[1] };

        let avIdMatch = url.match(/bilibili\.com\/video\/av([0-9]+)/);
        if (avIdMatch && avIdMatch[1]) return { type: 'avid', id: avIdMatch[1] };

        let epIdMatch = url.match(/bilibili\.com\/bangumi\/play\/ep([0-9]+)/);
        if (epIdMatch && epIdMatch[1]) return { type: 'epid', id: epIdMatch[1] };

        // 短縮URL (b23.tv/xxxx) は上記BVidでカバーできることが多い
        return null;
    }

    // Pornhub (注意: 自己責任で利用してください)
    function getPornhubVideoId(url) {
        const regExp = /pornhub\.com\/(?:view_video\.php\?viewkey=|embed\/)([a-zA-Z0-9]+)/;
        const match = url.match(regExp);
        return (match && match[1]) ? match[1] : null;
    }

    function getTikTokVideoId(url) {
        // 例: https://www.tiktok.com/@username/video/1234567890123456789
        // 例: https://m.tiktok.com/v/1234567890123456789.html
        // TikTokのURL構造は多様なので、より多くのパターンに対応する必要があるかもしれません。
        // 公式の埋め込みは <blockquote class="tiktok-embed" ... data-video-id="VIDEO_ID">
        // data-video-id を取得するのが確実だが、URLから直接取得するなら以下のような試み。
        let match = url.match(/tiktok\.com\/.*\/video\/(\d+)/);
        if (match && match[1]) {
            return match[1];
        }
        // 短縮URLや他の形式も考慮
        match = url.match(/tiktok\.com\/embed\/v2\/(\d+)/); // 既にembed URLの場合
        if (match && match[1]) {
            return match[1];
        }
        // 必要に応じて他の正規表現を追加
        return null;
    }


    // --- 画像URL判定ヘルパー関数 (拡張子判定とホスト名判定を統合) ---
    function isLikelyImageUrl(url) {
        if (typeof url !== 'string' || url.trim() === "") return false; // 空文字列もチェック
        // ★★★ Pixivの画像ホストの場合は、画像として直接埋め込まない ★★★
        try {
            const parsedUrlForPixivCheck = new URL(url);
            if (parsedUrlForPixivCheck.hostname === 'i.pximg.net') {
                return false; // Pixivの画像は直接埋め込み対象外とする
            }
        } catch (e) {
            // 無効なURLの場合は、以降の処理で判定されるか、ここでfalseを返しても良い
            // console.warn("Invalid URL for Pixiv check:", url, e.message);
        }
        // 1. 拡張子ベースの判定
        if (/\.(jpeg|jpg|gif|png|webp|svg|avif|bmp|ico)(\?.*)?$/i.test(url)) {
            return true;
        }

        // isLikelyImageUrl 関数内の該当部分を置き換えまたは拡張
        // 2. 特定のホスト名ベースの判定 (拡張子がない場合のフォールバック)
        try {
            const parsedUrl = new URL(url);
            const imageHostsAndPaths = [
                { host: 'yt3.ggpht.com' }, // YouTubeサムネイルなど - パスチェックはあまり有効でないことが多い
                {
                    host: 'lh3.googleusercontent.com',
                    pathKeywords: ['/img/', '/image/', '/p/', '/d/', '/a/', '/u/0/d/'], // パスに含まれがちなキーワード
                    paramKeywords: ['=w', '=h', '=s', 'резать'] // クエリパラメータに含まれがちなキーワード
                },
                { host: 'i.imgur.com' }, // Imgurの画像直リンク
                { host: 'pbs.twimg.com' }, // Twitterの画像
                { host: 'media.discordapp.net' },
                { host: 'cdn.discordapp.com' },
                { host: 'plus.unsplash.com' },
                { host: 'images.unsplash.com' },
                { host: 'media.istockphoto.com' },
                // Pixabay は拡張子があることが多いが、念のため
                { host: 'cdn.pixabay.com', pathKeywords: ['/photo/'] },
                // 他の画像ホスト
            ];

            for (const entry of imageHostsAndPaths) {
                let hostMatch = false;
                if (entry.host.startsWith('*.')) { // ワイルドカードサブドメイン
                    if (parsedUrl.hostname.endsWith(entry.host.substring(1))) {
                        hostMatch = true;
                    }
                } else {
                    if (parsedUrl.hostname === entry.host) {
                        hostMatch = true;
                    }
                }

                if (hostMatch) {
                    // ホスト名が一致した場合、さらに詳細な条件をチェック
                    let detailsMatch = true; // デフォルトはtrue (パスやパラメータの条件がなければホスト名だけでOK)

                    if (entry.pathKeywords && entry.pathKeywords.length > 0) {
                        detailsMatch = entry.pathKeywords.some(keyword => parsedUrl.pathname.includes(keyword));
                    }

                    if (detailsMatch && entry.paramKeywords && entry.paramKeywords.length > 0) {
                        // クエリパラメータのチェック (いずれかのキーワードが含まれていればOK)
                        // searchParams.toString() で全パラメータを文字列化して検索
                        const searchParamsString = parsedUrl.searchParams.toString();
                        detailsMatch = entry.paramKeywords.some(keyword => searchParamsString.includes(keyword));
                    }

                    // URLの末尾が特定のパターンで終わるか (オプション、より高度な判定)
                    // 例: Google Photos のURLの一部など
                    // if (detailsMatch && entry.host === 'lh3.googleusercontent.com') {
                    //     // 例: /AAAAAAAAAAAAAAAAYAAAAAAAAAAB/s{size}/photo.jpg のようなパターンの一部を検出
                    //     // これは非常に複雑になるため、ここでは省略
                    // }


                    if (detailsMatch) {
                        return true; // ホスト名と詳細条件が一致すれば画像とみなす
                    }
                }
            }

        } catch (e) {
            return false;
        }
        return false; // 上記のいずれにも一致しない
    }

    // 埋め込みURL生成ロジック (拡張)
    function generateEmbedUrl(url) {
        const youtubeId = getYouTubeVideoId(url);
        if (youtubeId) return `https://www.youtube.com/embed/${youtubeId}`;

        const nicoId = getNicoNicoVideoId(url);
        if (nicoId) return `https://embed.nicovideo.jp/watch/${nicoId}?oldScript=1&referer=&from=0`;

        const dailymotionId = getDailymotionVideoId(url);
        if (dailymotionId) return `https://www.dailymotion.com/embed/video/${dailymotionId}`;

        const vimeoId = getVimeoVideoId(url);
        if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}`;

        const bilibiliInfo = getBilibiliVideoInfo(url);
        if (bilibiliInfo) {
            if (bilibiliInfo.type === 'bvid') {
                return `//player.bilibili.com/player.html?bvid=${bilibiliInfo.id}&as_wide=1&high_quality=1&danmaku=0`;
            } else if (bilibiliInfo.type === 'avid') {
                return `//player.bilibili.com/player.html?aid=${bilibiliInfo.id}&as_wide=1&high_quality=1&danmaku=0`;
            } else if (bilibiliInfo.type === 'epid') {
                return `//player.bilibili.com/player.html?ep=${bilibiliInfo.id}&as_wide=1&high_quality=1&danmaku=0`;
            }
        }
        const pornhubId = getPornhubVideoId(url)
        if (pornhubId) {
            return `https://www.pornhub.com/embed/${pornhubId}`;
        }

        // TikTokの処理を追加
        const tiktokId = getTikTokVideoId(url); // 新しい関数
        if (tiktokId) {
            return `https://www.tiktok.com/embed/v2/${tiktokId}`;
        }

        // Wikipedia および あにまん掲示板の判定 (URLパースが必要なため、ここで行う)
        try {
            const parsedUrl = new URL(url); // URLをパース

            // Wikipediaの全言語版に対応 (例: ja.wikipedia.org, en.wikipedia.org, es.wikipedia.org)
            // ホスト名が ".wikipedia.org" で終わるかで判定
            if (parsedUrl.hostname.endsWith('.wikipedia.org')) {
                // Wikipediaページをそのままiframeで埋め込む
                // より良い埋め込みのためには、モバイルフレンドリーなビューや
                // 特定のセクションのみを埋め込む方法を検討する必要があるかもしれない。
                // ここでは単純に元のURLを返す。
                return url;
            }

            // あにまん掲示板の対応
            if (parsedUrl.hostname === "bbs.animanch.com" || parsedUrl.hostname === "animanch.com") {
                return url; // 元のURLをiframeのsrcにする
            }

        } catch (e) {

            return null; // 無効なURLとみなし、通常のリンク処理に進ませる
        }

        return null; // 上記のいずれにも一致しない場合は通常のURLとして扱う
    }

    // カスタムリンク/動画埋め込みハンドラ
    function customLinkHandler() {
        if (!quillInstance) return;

        let value = prompt(
            'URLを入力してください\nいくつかのサイトや媒体は埋め込み対応、非対応の場合はリンク\n技術・知識的問題で一部対応できていない場合も\n\n【動画】YouTube ニコニコ Dailymotion Vimeo Bilibili Pornhub TikTok\n【画像】Imgur Pinterest pixabay X Unsplash\n【埋め込み】あにまん ウィキペディア',
            'https://'
        );
        if (value) { // ユーザーがURLを入力し、キャンセルしなかった場合
            const embedUrl = generateEmbedUrl(value);
            if (embedUrl) {
                // 動画URLの場合
                const range = quillInstance.getSelection(true);
                quillInstance.insertEmbed(range.index, VideoEmbedBlot.blotName, embedUrl, Quill.sources.USER);
                quillInstance.setSelection(range.index + 1, Quill.sources.SILENT);
            } else if (isLikelyImageUrl(value)) { // ★ 統合された isLikelyImageUrl を使用
                const range = quillInstance.getSelection(true);
                quillInstance.insertEmbed(range.index, 'image', value, Quill.sources.USER);
                quillInstance.setSelection(range.index + 1, Quill.sources.SILENT);
            } else {
                // 通常のURLの場合
                const range = quillInstance.getSelection(true);
                if (range && range.length > 0) { // テキストが選択されている場合
                    // sanitizedUrl を直接使わず、value を渡す
                    quillInstance.formatText(range.index, range.length, 'link', value, Quill.sources.USER);
                } else { // テキストが選択されていない場合、URL自体をテキストとして挿入しリンク化
                    quillInstance.insertText(range.index, value, 'link', value, Quill.sources.USER);
                    quillInstance.setSelection(range.index + value.length, Quill.sources.SILENT);
                }
            }
        }
    }


    async function generateSimpleTrip(key, password = "") {
        if (!key) return "";

        const combinedKey = key + (password ? "#" + password : "");

        // 文字列をUTF-8バイト配列にエンコード
        const encoder = new TextEncoder();
        const data = encoder.encode(combinedKey);

        // SHA-256ハッシュを計算 (ブラウザ標準のSubtleCrypto APIを使用)
        try {
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));

            // ハッシュ値をBase64エンコードし、特定の長さに切り詰めて記号を追加
            // (Base64エンコードはブラウザ標準のbtoaを使うが、Uint8Arrayからは直接使えないので工夫が必要)
            let binaryString = "";
            hashArray.forEach(byte => {
                binaryString += String.fromCharCode(byte);
            });
            const base64Hash = btoa(binaryString);

            // Base64文字列から英数字のみを取り出し、先頭10文字と記号◆を組み合わせる
            // (これはあくまで「それっぽい」トリップを生成するための一例)
            const tripChars = base64Hash.replace(/[^a-zA-Z0-9]/g, ''); // 英数字以外を除去
            return "◆" + tripChars.substring(0, 10);

        } catch (error) {
            console.error("Trip generation error:", error);
            return "◆ERROR";
        }
    }

    function showMathJSInputUI() {
        if (!quillInstance) return;

        // 既存のQuillのプロンプトUIを参考に、簡易的なものを自作するか、
        // Quill.theme.tooltip.prompt() があればそれを利用する (ただし、これはリンク専用に近い)
        // ここでは簡易的な自作プロンプトを想定

        const userInput = prompt(
            "ダイス/計算の式を入力してください(グラデーションで使用を確認)\n" +
            "※出力内容を編集するとグラデーションが解除されます\n" +
            "【計算】\n" +
            "基本：2+2*3　(10-2)/4\n" +
            "関数：sqrt(16)　sin(pi/2)　log(100, 10)\n" +
            "べき乗：2^3\n" +
            "単位変換：5cm+2inch to mm\n" +
            "複素数：(2+3i)*(1-2i)　sqrt(-4)\n" +
            "行列(基本)：[1,2]+[3,4]\n" +
            "進数：0b101(2進数で5)　hex(10)(10を16進数に)\n" +
            "定義関数：f(x)=x^2;f(5)\n" +
            "トリップ出力：/trip#123\n\n" +

            "【通常ダイス(XdY+-Z)】\n" +
            "6面ダイスを2個振る：2d6\n" +
            "100面ダイス1個に+5：1d100+5\n" +
            "【文字ダイス(/コマンド*Z(最大100)】\n" +
            "ひらがな1文字ランダム：/hira\n" +
            "カタカナ3文字ランダム：/kana*3\n" +
            "アルファベット大小1文字ランダム：/alpha\n" +
            "アルファベット大5文字ランダム：/alpha_up*5\n" +
            "アルファベット小2文字ランダム：/alpha_low*2\n" +
            "【目標ロール(最大1000ループ)】\n" +
            "6面ダイスで6が出るまで振る：/target_roll_d6=6\n" +
            ""
        );

        if (userInput !== null && userInput.trim() !== "") { // ユーザーが入力し、空でない場合
            processMathJSInput(userInput);
        }
    }
    // Math.jsインスタンス (math) とQuillインスタンス (quillInstance) が
    // この関数からアクセスできるスコープに存在すると仮定
    // この関数は、グローバルまたはDOMContentLoadedスコープで定義された
    // quillInstance (Quillのインスタンス) と
    // math (Math.jsのインスタンス) にアクセスできることを前提とします。
    // また、ResultTextBlot が Quill.register() で登録済みであること。

    async function processMathJSInput(inputString) {
        if (!quillInstance) {
            console.warn("Quill instance is not available in processMathJSInput.");
            alert("エディタの準備ができていません。");
            return;
        }

        let resultText = ""; // 最終的にエディタに挿入する文字列
        const originalInput = inputString; // ユーザーが入力した元の文字列を保持
        const lcInput = typeof inputString === 'string' ? inputString.toLowerCase().trim() : ""; // 判定用に小文字化・トリム

        if (lcInput === "") {
            // alert("入力が空です。"); // 必要に応じてユーザーに通知
            return; // 空の入力は何もしない
        }

        try {
            let commandProcessedByCustomLogic = false; // カスタムコマンドで処理されたか

            // --- 1. スラッシュで始まるカスタムコマンドの判定 ---
            if (lcInput.startsWith("/")) {

                // --- 1.1. ひらがなランダム (/hira または /hira*X) ---
                if (lcInput.startsWith("/hira")) {
                    commandProcessedByCustomLogic = true;
                    const hiragana = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
                    let numChars = 1;
                    const matchNum = lcInput.match(/^\/hira(?:\*(\d+))?$/);

                    if (matchNum) {
                        if (matchNum[1]) {
                            const requestedChars = parseInt(matchNum[1]);
                            if (requestedChars > 0 && requestedChars <= 100) {
                                numChars = requestedChars;
                            } else if (requestedChars > 100) {
                                numChars = 100;
                                alert("ひらがなの出力数上限は100文字です。100文字で出力します。");
                            } else {
                                resultText = `エラー: ひらがなの出力数は1以上の数値を指定してください。`;
                            }
                        } else { // /hira のみ
                            numChars = 1;
                        }
                    } else { // /hira でも /hira*数字 でもないが /hira で始まる場合
                        resultText = `エラー: 無効なひらがなコマンド形式です (例: /hira または /hira*3)`;
                    }

                    if (!resultText) {
                        let randomChars = "";
                        for (let i = 0; i < numChars; i++) {
                            const randomIndex = Math.floor(Math.random() * hiragana.length);
                            randomChars += hiragana.charAt(randomIndex);
                        }
                        resultText = `${originalInput} → 結果: ${randomChars}`;
                    }
                }
                // --- 1.2. カタカナランダム (/kana または /kana*X) ---
                else if (lcInput.startsWith("/kana")) {
                    commandProcessedByCustomLogic = true;
                    const katakana = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
                    let numChars = 1;
                    const matchNum = lcInput.match(/^\/kana(?:\*(\d+))?$/);

                    if (matchNum) {
                        if (matchNum[1]) {
                            const requestedChars = parseInt(matchNum[1]);
                            if (requestedChars > 0 && requestedChars <= 100) {
                                numChars = requestedChars;
                            } else if (requestedChars > 100) {
                                numChars = 100;
                                alert("カタカナの出力数上限は100文字です。100文字で出力します。");
                            } else {
                                resultText = `エラー: カタカナの出力数は1以上の数値を指定してください。`;
                            }
                        } else { // /kana のみ
                            numChars = 1;
                        }
                    } else {
                        resultText = `エラー: 無効なカタカナコマンド形式です (例: /kana または /kana*3)`;
                    }

                    if (!resultText) {
                        let randomChars = "";
                        for (let i = 0; i < numChars; i++) {
                            const randomIndex = Math.floor(Math.random() * katakana.length);
                            randomChars += katakana.charAt(randomIndex);
                        }
                        resultText = `${originalInput} → 結果: ${randomChars}`;
                    }
                }
                // --- 1.3. アルファベットランダム ---
                else if (lcInput.startsWith("/alpha")) {
                    commandProcessedByCustomLogic = true;
                    const alphabetUpper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                    const alphabetLower = "abcdefghijklmnopqrstuvwxyz";
                    let alphabetToUse = alphabetUpper + alphabetLower;
                    let typeSuffix = " (大小文字)";
                    let commandBase = "/alpha";
                    let numChars = 1;

                    if (lcInput.startsWith("/alpha_upper")) {
                        alphabetToUse = alphabetUpper;
                        typeSuffix = " (大文字)";
                        commandBase = "/alpha_upper";
                    } else if (lcInput.startsWith("/alpha_lower")) {
                        alphabetToUse = alphabetLower;
                        typeSuffix = " (小文字)";
                        commandBase = "/alpha_lower";
                    }

                    const numPartRegex = new RegExp(`^${commandBase}(?:\\*(\\d+))?$`);
                    const numMatch = lcInput.match(numPartRegex);

                    if (numMatch) {
                        if (numMatch[1]) {
                            const requestedChars = parseInt(numMatch[1]);
                            if (requestedChars > 0 && requestedChars <= 100) {
                                numChars = requestedChars;
                            } else if (requestedChars > 100) {
                                numChars = 100;
                                alert("アルファベットの出力数上限は100文字です。100文字で出力します。");
                            } else {
                                resultText = `エラー: アルファベットの出力数は1以上の数値を指定してください。`;
                            }
                        } else { // 数値指定なし (例: /alpha)
                            numChars = 1;
                        }
                    } else { // コマンドの基本形式に一致しない
                        resultText = `エラー: 無効なアルファベットコマンド形式です (例: ${commandBase} または ${commandBase}*5)`;
                    }

                    if (!resultText) {
                        let randomChars = "";
                        for (let i = 0; i < numChars; i++) {
                            const randomIndex = Math.floor(Math.random() * alphabetToUse.length);
                            randomChars += alphabetToUse.charAt(randomIndex);
                        }
                        resultText = `${originalInput} → 結果: ${randomChars}${typeSuffix}`;
                    }
                }
                else if (lcInput.startsWith("/target_roll_d")) {
                    commandProcessedByCustomLogic = true;
                    const paramsMatch = lcInput.match(/^\/target_roll_d(\d+)\s*=\s*(\d+)$/);

                    if (paramsMatch) {
                        const numDice = 1; // ダイスの数は常に1
                        const numSides = parseInt(paramsMatch[1]);
                        const targetValue = parseInt(paramsMatch[2]);
                        let rolls = [];
                        let currentRollValue;
                        let attempts = 0;
                        const maxAttempts = 1000;

                        // --- ★ バリデーションの強化 ★ ---
                        if (numSides <= 0) {
                            resultText = `エラー: ダイスの面数は1以上である必要があります。(${originalInput})`;
                        } else if (targetValue < 1) { // 目標値が1未満の場合
                            resultText = `エラー: 目標値は1以上である必要があります。(${originalInput})`;
                        } else if (targetValue > numSides) { // ★ 目標値がダイスの最大値を上回る場合 ★
                            resultText = `エラー: 目標値(${targetValue})がダイスの最大値(${numSides})を超えています。このダイスでは絶対に出せません。(${originalInput})`;
                        }
                        // --- ★ バリデーションここまで ★ ---
                        else { // バリデーションをすべて通過した場合
                            do {
                                currentRollValue = Math.floor(Math.random() * numSides) + 1;
                                rolls.push(currentRollValue);
                                attempts++;
                                if (attempts >= maxAttempts) {
                                    resultText = `${originalInput} → ${maxAttempts}回試行しましたが目標値(${targetValue})が出ませんでした。\n最後の出目: ${currentRollValue}\n(試行履歴: [${rolls.join(', ')}])`;
                                    break;
                                }
                            } while (currentRollValue !== targetValue);

                            if (attempts < maxAttempts) { // 目標達成
                                resultText = `${originalInput} → ${attempts}回目で目標値 ${targetValue} が出ました！\n(試行履歴: [${rolls.join(', ')}])`;
                            }
                        }
                    } else {
                        resultText = `エラー: 無効なターゲットロール形式です (例: /target_roll_d6=6)`;
                    }
                } else if (lcInput.startsWith("/trip#")) { // ★ コマンド形式を変更
                    commandProcessedByCustomLogic = true;
                    // "/trip#" の部分を除いた文字列を取得
                    const tripInputString = originalInput.substring("/trip#".length);

                    let tripKey = "";
                    let tripPassword = "";

                    if (tripInputString.trim() === "") { // キー部分が空または空白のみ
                        resultText = `エラー: トリップキーが指定されていません (例: /trip#わたしのキー)`;
                    } else {
                        const parts = tripInputString.split('#'); // キーとパスワードを # で分割
                        tripKey = parts[0].trim(); // 最初の部分をキーとしてトリム

                        if (parts.length > 1) { // # が含まれていれば、2つ目以降をパスワードとする
                            // # が複数ある場合も考慮し、最初の # 以降を全てパスワードとする
                            tripPassword = tripInputString.substring(tripInputString.indexOf('#', parts[0].length) + 1);
                            // もしキーの直後の#のみを区切りとしたいなら:
                            // tripPassword = parts.slice(1).join('#'); // これだとキーに#が使えない
                        }

                        if (tripKey) { // キーが空でないことを確認
                            const generatedTrip = await generateSimpleTrip(tripKey, tripPassword);
                            if (generatedTrip && generatedTrip !== "◆ERROR") {
                                // ★ 結果表示をトリップのみに変更 ★
                                resultText = `${generatedTrip}`;
                            } else {
                                resultText = `エラー: トリップの生成に失敗しました。`;
                            }
                        } else { // 分割した結果キーが空になった場合 (例: /trip##password)
                            resultText = `エラー: トリップキーが指定されていません (例: /trip#わたしのキー)`;
                        }
                    }
                }
                // --- 他のカスタムコマンドや未知のコマンド処理 ---
                else {
                    commandProcessedByCustomLogic = true;
                    resultText = `エラー: 不明なコマンド「${originalInput}」です。\n利用可能なコマンドを確認してください。`;
                }
            }
            // --- 2. Math.jsベースの標準的なダイスロール (XdY[+/-Z]) または 数式評価 ---
            if (!commandProcessedByCustomLogic) { // カスタムコマンドとして処理されなかった場合のみ
                if (!math) {
                    resultText = `エラー: 計算機能(Math.js)がロードされていません。「${originalInput}」を評価できませんでした。`;
                } else {
                    const diceMatch = lcInput.match(/^(\d+)d(\d+)(?:([+-])(\d+))?$/i);
                    if (diceMatch) { // 標準ダイスロール
                        const numDice = parseInt(diceMatch[1]);
                        const numSides = parseInt(diceMatch[2]);
                        const operator = diceMatch[3];
                        const modifier = diceMatch[4] ? parseInt(diceMatch[4]) : 0;

                        if (numDice > 0 && numSides > 0 && numDice <= 100) {
                            let rolls = [];
                            let sum = 0;
                            for (let i = 0; i < numDice; i++) {
                                const roll = math.randomInt(1, numSides + 1);
                                rolls.push(roll);
                                sum += roll;
                            }
                            if (operator === '+') sum += modifier;
                            else if (operator === '-') sum -= modifier;
                            resultText = `${originalInput} → 結果: ${sum} (出目: [${rolls.join(', ')}]${diceMatch[3] ? ` ${diceMatch[3]} ${modifier}` : ''})`;
                        } else {
                            resultText = `エラー: 無効なダイス指定です (${originalInput})。ダイスの数や面は1以上、数は100以下にしてください。`;
                        }
                    } else { // 数式評価
                        const result = math.evaluate(originalInput);
                        resultText = `${originalInput} = ${result.toString()}`;
                    }
                }
            }

        } catch (err) {
            console.error("処理エラー (processMathJSInput):", err);
            resultText = `エラー: 「${originalInput}」の処理中に予期せぬ問題が発生しました。\n入力形式を確認してください。`;
            if (err && err.message) {
                resultText += `\n(詳細: ${err.message})`;
            }
        }

        // 結果をQuillに挿入
        if (resultText) {
            const range = quillInstance.getSelection(true);
            let insertPos = range ? range.index : quillInstance.getLength();

            if (range && range.length > 0) {
                quillInstance.deleteText(range.index, range.length, Quill.sources.USER);
                insertPos = range.index;
            }

            // ★ 修正箇所: ResultTextBlot (EmbedBlot) を使って挿入 ★
            quillInstance.insertEmbed(insertPos, ResultTextBlot.blotName, resultText, Quill.sources.USER);
            // Embedの後に改行を挿入
            quillInstance.insertText(insertPos + 1, '\n', Quill.sources.USER); // Embedの長さは1なので+1

            quillInstance.setSelection(insertPos + 1 + 1, Quill.sources.SILENT); // Embed(1) + 改行(1) の後にカーソル
            quillInstance.focus();
        }
    }
    function imageHandler() {
        if (!quillInstance) return;

        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*'); // 画像ファイルのみ
        input.click();

        input.onchange = () => {
            const file = input.files[0];
            if (file) {
                // オプション1: Base64エンコード (小さな画像向け、デモ用)
                const reader = new FileReader();
                reader.onload = (e) => {
                    const dataUrl = e.target.result;
                    const range = quillInstance.getSelection(true);
                    quillInstance.insertEmbed(range.index, 'image', dataUrl, Quill.sources.USER);
                    quillInstance.setSelection(range.index + 1, Quill.sources.SILENT);
                };
                reader.readAsDataURL(file);

                // オプション2: サーバーへアップロード (実運用向け)
                // const formData = new FormData();
                // formData.append('imageFile', file); // 'imageFile'はサーバー側のキー

                // fetch('/upload-image-endpoint', { // サーバーのアップロードAPIエンドポイント
                //     method: 'POST',
                //     body: formData
                // })
                // .then(response => {
                //     if (!response.ok) throw new Error('Upload failed: ' + response.statusText);
                //     return response.json(); // サーバーは画像のURLをJSONで返すと仮定
                // })
                // .then(data => {
                //     if (data.imageUrl) {
                //         const range = quillInstance.getSelection(true);
                //         quillInstance.insertEmbed(range.index, 'image', data.imageUrl, Quill.sources.USER);
                //         quillInstance.setSelection(range.index + 1, Quill.sources.SILENT);
                //     } else {
                //         throw new Error('Server did not return an image URL.');
                //     }
                // })
                // .catch(error => {
                //     console.error('Image upload error:', error);
                //     alert('画像のアップロードに失敗しました: ' + error.message);
                // });
            }
        };
    }

    // DOMContentLoaded 内

    // ... (quillInstance, math などの初期化は同様) ...
    // ... (AudioBlot, LetterSpacingBlot, VideoEmbedBlot, LocalVideoBlot の定義) ...
    // ... (URL判定・生成関連のヘルパー関数) ...
    // ... (customLinkHandler, audioHandler, localVideoHandler, imageHandler の定義) ...
    // ... (showMathJSInputUI, processMathJSInput の定義) ...


    // ★★★ 行選択機能のロジック関数 ★★★
    function selectCurrentLine() {
        if (!quillInstance) {
            console.warn("Quill instance not available for selectCurrentLine.");
            return;
        }
        const selection = quillInstance.getSelection();
        if (!selection) {
            // エディタにフォーカスがない場合、フォーカスを試みてから再度実行するか、何もしない
            quillInstance.focus(); // フォーカスを試みる
            // 少し待ってから再度試すこともできるが、ここでは一旦リターン
            console.warn("No selection/cursor found. Please focus the editor.");
            return;
        }

        // 現在のカーソル位置から行の情報を取得
        const [lineBlot, offsetInLine] = quillInstance.getLine(selection.index);

        if (lineBlot) {
            const lineStartIndex = quillInstance.getIndex(lineBlot);
            let lineLength = lineBlot.length();

            // 行末の改行文字を選択範囲に含めるかどうかの調整
            // 一般的には、ユーザーが行を選択するとき、その行のテキスト内容を対象とする。
            // 改行文字も選択したい場合は、以下の if 文を削除または調整する。
            if (lineLength > 0 && quillInstance.getText(lineStartIndex + lineLength - 1, 1) === '\n') {
                lineLength -= 1; // 行末の改行文字を除外
            }

            if (lineLength > 0) {
                quillInstance.setSelection(lineStartIndex, lineLength, Quill.sources.USER);
            } else if (lineBlot.length() > 0) { // 改行のみの行の場合 (lineLengthが0になったが、元の長さはある)
                quillInstance.setSelection(lineStartIndex, lineBlot.length(), Quill.sources.USER); // 改行自体を選択
            }
            quillInstance.focus();
        } else {
            console.warn("Could not get current line information.");
        }
    }

    // ★★★ 全選択機能のロジック関数 ★★★
    function selectAllText() {
        if (!quillInstance) {
            console.warn("Quill instance not available for selectAllText.");
            return;
        }
        const length = quillInstance.getLength();
        if (length > 0) {
            // QuillのgetLength()は最後に必ず改行を1つ含むため、
            // 実際の表示テキスト全体を選択する場合は length - 1 とすることが多い。
            // 全てのコンテンツ（最後の不可視改行も含む）を選択する場合は length のまま。
            const selectionLength = length > 1 ? length - 1 : length;
            quillInstance.setSelection(0, selectionLength, Quill.sources.USER);
        }
        quillInstance.focus();
    }



    let lastSearchTerm = '';
    let allMatches = []; // 現在の検索語に対する全ての一致箇所のリスト
    let currentMatchHighlightIndex = -1; // allMatches の中で現在選択されているインデックス

    // (オプション) ハイライトクリア関数
    function clearAllHighlights() {
        if (!quillInstance) return;
        // ここでは選択を解除するだけに留める (永続ハイライトの場合は別途実装)
        // quillInstance.setSelection(null); // もし選択も解除したいなら
        console.log("以前の選択/ハイライトはクリアされました（選択のみの場合）。");
    }

    // (オプション) スクロール関数 (以前の改善案を採用)
    function scrollToMatch(index) {
        if (!quillInstance || !quillInstance.scrollingContainer) {
            console.warn("Quill instance or scrollingContainer not available for scrolling.");
            // Fallback or alternative scrolling if needed
            const blot = quillInstance.getLeaf(index)[0];
            if (blot && blot.domNode) {
                blot.domNode.scrollIntoView({ behavior: 'auto', block: 'center' }); // 'smooth' だと連続操作で違和感あるかも
            }
            return;
        }
        // 以下はより詳細な制御が必要な場合の代替 (scrollIntoViewを優先)
        // const bounds = quillInstance.getBounds(index);
        // if (bounds) {
        //     const containerRect = quillInstance.scrollingContainer.getBoundingClientRect();
        //     quillInstance.scrollingContainer.scrollTop = bounds.top - containerRect.top - 50;
        // }
    }


    // 文字列検索と選択のロジック
    function findAndHighlightText(newSearchTerm, direction = 'forward', isInitialSearch = false) {
        if (!quillInstance) return false;

        const searchTermToUse = newSearchTerm.trim();

        if (isInitialSearch) { // 新規検索の場合
            if (searchTermToUse === "") {
                alert("検索文字列を入力してください。");
                clearAllHighlights(); // 検索語が空ならハイライトもクリア
                allMatches = [];
                currentMatchHighlightIndex = -1;
                lastSearchTerm = "";
                return false;
            }
            // 新しい検索語の場合、以前の情報をリセット
            clearAllHighlights();
            allMatches = [];
            currentMatchHighlightIndex = -1; // リセット
            lastSearchTerm = searchTermToUse;

            const text = quillInstance.getText();
            const escapedSearchTerm = searchTermToUse.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedSearchTerm, 'gi');
            let match;
            while ((match = regex.exec(text)) !== null) {
                allMatches.push({ index: match.index, length: match[0].length });
            }

            if (allMatches.length === 0) {
                alert(`「${searchTermToUse}」は見つかりませんでした。`);
                return false;
            }
            // 新規検索時は、最初の結果を指すようにする (direction が 'forward' の場合)
            // direction が 'backward' の場合は最後の結果を指すことも考えられるが、UIと合わせる
            currentMatchHighlightIndex = (direction === 'forward' || allMatches.length === 1) ? 0 : allMatches.length - 1;

        } else { // 次へ/前へ検索の場合
            if (allMatches.length === 0 || lastSearchTerm === "") {
                // alert("まず検索を実行してください。"); // これはハンドラ側で制御
                return false;
            }
            if (direction === 'forward') {
                currentMatchHighlightIndex++;
                if (currentMatchHighlightIndex >= allMatches.length) {
                    currentMatchHighlightIndex = 0;
                }
            } else if (direction === 'backward') {
                currentMatchHighlightIndex--;
                if (currentMatchHighlightIndex < 0) {
                    currentMatchHighlightIndex = allMatches.length - 1;
                }
            }
        }

        // 該当箇所を選択し、フォーカス、スクロール
        if (allMatches.length > 0 && currentMatchHighlightIndex >= 0 && currentMatchHighlightIndex < allMatches.length) {
            const currentMatch = allMatches[currentMatchHighlightIndex];
            quillInstance.setSelection(currentMatch.index, currentMatch.length, Quill.sources.USER);
            quillInstance.focus();
            scrollToMatch(currentMatch.index); // スクロール処理を呼び出し

            console.log(`「${lastSearchTerm}」(${currentMatchHighlightIndex + 1}/${allMatches.length}) を選択中。位置: ${currentMatch.index}`);
            return true;
        }
        return false; // 何らかの理由で選択できなかった場合
    }


    // --- 新しいツールバーハンドラ定義 (更新) ---
    function handleSearchTool() {
        if (!quillInstance) return;
        const searchTerm = prompt("検索する文字列を入力してください:", lastSearchTerm);
        if (searchTerm !== null) { // ユーザーがキャンセルしなかった場合
            findAndHighlightText(searchTerm, 'forward', true); // 新規検索としてマーク
        }
    }

    function handleFindNextTool() {
        if (!quillInstance) return;
        if (!lastSearchTerm) {
            alert("まず「検索」ボタンで検索を実行してください。");
            handleSearchTool();
            return;
        }
        findAndHighlightText(lastSearchTerm, 'forward', false); // 次を検索
    }

    function handleFindPreviousTool() {
        if (!quillInstance) return;
        if (!lastSearchTerm) {
            alert("まず「検索」ボタンで検索を実行してください。");
            handleSearchTool();
            return;
        }
        findAndHighlightText(lastSearchTerm, 'backward', false); // 前を検索
    }

    let isAAModeActive = false; // エディタ全体がAAモードかどうかのフラグ

    // --- エディタ全体のAAスタイルを調整する関数 ---
    function adjustGlobalAAStyles() {
        if (!quillInstance || !quillInstance.root || !isAAModeActive) {
            // AAモードでない場合、または初期化前はデフォルトスタイルに戻す処理を検討
            // (実際にはAAモード解除時に行う)
            return;
        }

        const editorElement = quillInstance.root; // .ql-editor
        const editorContainerWidth = editorElement.offsetWidth;
        let globalMaxCharsPerLine = 0;

        // エディタ内の全テキストを取得し、AAモードとして扱われるべき行の最大文字数を計算
        // (ここでは簡略化のため、エディタ全体のテキストから計算するが、
        //  実際にはAAモードが適用されているブロックのみを対象にする方が良いかもしれない)
        const allText = quillInstance.getText();
        const lines = allText.split('\n');

        lines.forEach(line => {
            let visualLength = 0;
            for (let i = 0; i < line.length; i++) {
                visualLength += (line.charCodeAt(i) > 255) ? 2 : 1;
            }
            if (visualLength > globalMaxCharsPerLine) {
                globalMaxCharsPerLine = visualLength;
            }
        });

        if (globalMaxCharsPerLine === 0 && lines.length <= 1 && lines[0] === '') { // 内容が本当に空の場合
            // AAブロックが存在しない、または内容が空ならデフォルトサイズに戻すか何もしない
            editorElement.querySelectorAll('.ql-aa-block').forEach(block => {
                block.style.fontSize = ''; // CSSで設定されたデフォルトに戻す
                block.style.lineHeight = '';
            });
            return;
        }
        if (globalMaxCharsPerLine === 0 && lines.length > 0) { // 内容はあるが文字としてカウントされない場合(例: 改行のみ)
            globalMaxCharsPerLine = 80; // デフォルトの文字数を仮定 (調整可能)
        }


        // CSSのpaddingを考慮 (ここではエディタ全体のpaddingを想定)
        const computedEditorStyle = getComputedStyle(editorElement);
        const editorPaddingLeft = parseFloat(computedEditorStyle.paddingLeft) || 0;
        const editorPaddingRight = parseFloat(computedEditorStyle.paddingRight) || 0;
        const availableWidthForText = editorContainerWidth - editorPaddingLeft - editorPaddingRight - 10; // スクロールバー等のマージン

        const idealCharWidth = availableWidthForText / globalMaxCharsPerLine;
        const CHAR_ASPECT_RATIO = 0.58; // ★★ AA用フォントの 文字幅/フォント高さ 比率 (要調整) ★★
        let calculatedFontSize = idealCharWidth / CHAR_ASPECT_RATIO;

        const MIN_FONT_SIZE = 6;  // px
        const MAX_FONT_SIZE = 16; // px
        calculatedFontSize = Math.max(MIN_FONT_SIZE, Math.min(calculatedFontSize, MAX_FONT_SIZE));
        // calculatedFontSize = Math.floor(calculatedFontSize * 10) / 10; // 小数点第一位で丸める (任意)

        const calculatedLineHeight = Math.max(1.0, Math.min(calculatedFontSize * 1.1 / calculatedFontSize, 1.25));

        // エディタ内の全ての .ql-aa-block 要素にスタイルを適用
        editorElement.querySelectorAll('.ql-aa-block').forEach(block => {
            block.style.fontSize = `${calculatedFontSize.toFixed(1)}px`;
            block.style.lineHeight = calculatedLineHeight.toFixed(2);
        });
        console.log(`AA Mode Global Style: FS=${calculatedFontSize.toFixed(1)}px, LH=${calculatedLineHeight.toFixed(2)} (MaxChars: ${globalMaxCharsPerLine}, EditorWidth: ${editorContainerWidth})`);
    }

    // --- AAモード切り替えハンドラ ---
    function toggleAAMode() {
        if (!quillInstance) return;
        const editorElement = quillInstance.root; // .ql-editor

        isAAModeActive = !isAAModeActive; // AAモードの状態をトグル

        if (isAAModeActive) {
            // AAモードを適用
            editorElement.classList.add('aa-mode-active'); // エディタ全体にAAモードクラスを追加 (CSSで基本フォントなどを制御)

            // 現在のエディタの内容を取得
            const delta = quillInstance.getContents();
            const newOps = [];
            let currentBlockAttributes = {};

            // 各行をAAブロックに変換する (既存のブロックフォーマットを上書き)
            // (もっと洗練されたDelta操作が必要になる場合がある)
            delta.ops.forEach(op => {
                if (op.insert) {
                    const text = op.insert;
                    const attributes = op.attributes || {};
                    // 既存のブロックフォーマット属性(header, listなど)を削除し、aa-blockを追加
                    const newAttributes = { ...attributes };
                    delete newAttributes.header;
                    delete newAttributes.list;
                    delete newAttributes.blockquote;
                    delete newAttributes.indent;
                    delete newAttributes['code-block'];
                    // インラインフォーマットは保持される

                    if (text.includes('\n')) {
                        const lines = text.split('\n');
                        lines.forEach((line, index) => {
                            if (line.length > 0) {
                                newOps.push({ insert: line, attributes: newAttributes });
                            }
                            if (index < lines.length - 1) { // 最後の改行以外
                                // 各行をaa-blockにする
                                newOps.push({ insert: '\n', attributes: { ...currentBlockAttributes, [AsciiArtBlockBlot.blotName]: true } });
                                currentBlockAttributes = {}; // 次の行のためにリセット
                            } else if (text.endsWith('\n')) { // 最後の文字が改行の場合
                                // 最後の行が改行で終わる場合、その改行にもaa-blockを適用
                                newOps.push({ insert: '\n', attributes: { ...currentBlockAttributes, [AsciiArtBlockBlot.blotName]: true } });
                                currentBlockAttributes = {};
                            } else {
                                // 最後の行が改行で終わらない場合、現在のブロック属性を保持
                                currentBlockAttributes = { ...currentBlockAttributes, ...newAttributes };
                            }
                        });
                    } else { // 改行を含まないインサート
                        newOps.push({ insert: text, attributes: newAttributes });
                        currentBlockAttributes = { ...currentBlockAttributes, ...newAttributes };
                    }
                } else if (op.attributes && op.insert === '\n') { // フォーマットのみの改行
                    newOps.push({ insert: '\n', attributes: { ...op.attributes, ...currentBlockAttributes, [AsciiArtBlockBlot.blotName]: true } });
                    currentBlockAttributes = {};
                } else {
                    newOps.push(op); // retain や delete はそのまま
                }
            });
            // 最後のブロックにAAモードを適用 (もし改行で終わっていなければ)
            if (Object.keys(currentBlockAttributes).length > 0 || (newOps.length > 0 && !newOps[newOps.length - 1].insert.endsWith('\n'))) {
                // 最後の操作が insert で、それが改行で終わっていない場合、そのブロックにaa-blockを適用
                let lastOp = newOps.length > 0 ? newOps[newOps.length - 1] : null;
                if (lastOp && lastOp.insert && !lastOp.insert.endsWith('\n')) {
                    // このアプローチは複雑すぎる。formatLineを使う方がシンプル。
                }
            }

            // Deltaを直接操作する代わりに、formatLineで全行をAAブロックにする
            const length = quillInstance.getLength();
            quillInstance.formatLine(0, length, AsciiArtBlockBlot.blotName, true, Quill.sources.USER);


            adjustGlobalAAStyles(); // スタイルを即時調整
            console.log("AAモードを適用しました。");
        } else {
            // AAモードを解除
            editorElement.classList.remove('aa-mode-active');
            // 全てのAAブロックを通常の段落に戻す
            const length = quillInstance.getLength();
            quillInstance.formatLine(0, length, AsciiArtBlockBlot.blotName, false, Quill.sources.USER);

            // JSで設定したインラインスタイルをリセット
            editorElement.querySelectorAll('.ql-aa-block').forEach(block => {
                block.style.fontSize = '';
                block.style.lineHeight = '';
            });
            console.log("AAモードを解除しました。");
        }
        quillInstance.focus();
    }

    function codeDisplay(){
        const codeDisplay = document.getElementById("code-display");
        codeDisplay.style.display = codeDisplay.style.display === "block" ? "none" : "block"; 
        codeOn = !codeOn;
        initializeMonacoEditor()
    }
    function canvasDisplay(){
        const canvasDisplay = document.getElementById("canvas-display");
        canvasDisplay.style.display = canvasDisplay.style.display === "block" ? "none" : "block";
    }
    function audioDisplay(){
        const audioDisplay = document.getElementById("audio-display");
        audioDisplay.style.display = audioDisplay.style.display === "block" ? "none" : "block";
    }



    // --- フォント設定 ---
    const allowedFonts = [
        'sans-serif', 'Serif', 'Monospace', 'cursive', 'fantasy', // ジェネリック (Serif/Monospaceは先頭大文字でCSSと合わせる)
        "MS-Gothic", "MS-Mincho", "Yu-Gothic", "Hiragino-Kaku-Gothic", "Hiragino-Mincho",
        "Noto-Sans-JP", "Noto-Serif-JP", "IPA-Gothic", "IPA-Mincho", "Planetarium",
        "ChilloutTYP-Regular", "Buildingsandundertherailwaytracks-Regular", "Dancers",
        "HannariMincho-Regular", "Koku-Mincho", "Anzumoji", "Onryou", "Kowai",
        "Reggae-One", "Ankoku", "Chikara-Duyoku", "Chikara-Yowaku", "Mona",
        "Arial", "Verdana", "Georgia", "Times-New-Roman", "Impact", "Trebuchet-MS",
        "Palatino-Linotype", "Tahoma", "Segoe-UI", "Comic-Sans-MS", "Roboto",
        "Open-Sans", "Noto-Sans", "Montserrat", "Lato", "Roboto-Flex", "Inter",
        "Regular", "Dancing-Script", "Orbitron", "Press-Start-2P", "Bungee", "Lobster",
        "Bubblegum-Sans", "Courier-New", "Monaco"
    ];
    Font.whitelist = allowedFonts;
    Quill.register(Font, true); // 一度だけ登録

    // --- 文字間隔オプション ---
    const letterSpacingOptions = [
        false, '0.5px', '1px', '1.5px', '2px', '2.5px', '3px',
        '-0.5px', '-1px', '-1.5px', '-2px', '-2.5px', '-3px',
    ];

    // --- ツールバーオプション定義 ---
    const toolbarOptions = [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': allowedFonts }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        [{ 'letterspacing': letterSpacingOptions }],
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote', 'code-block'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'check' }],
        [{ 'script': 'sub' }, { 'script': 'super' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        [{ 'align': [] }],
        ['aa-block'],
        ['html-mode' ,'draw-mode','audio-mode'],
        ['link', 'image', 'audio-button', 'localvideo-button', 'localtext-button',],
        ['formula', 'calculator-button'],
        ['select-line-tool', 'select-all-tool', 'find-previous-tool', 'search-tool', 'find-next-tool'], // ★ 選択・検索ツール追加
        ['clean'],
        ['html-download', 'text-download', 'image-download'],
    ];

    // --- Quillインスタンス作成 ---
    quillInstance = new Quill('#editor', {
        modules: {
            toolbar: {
                container: toolbarOptions,
                handlers: {
                    'link': customLinkHandler,   // カスタムリンク/動画ハンドラ
                    'audio-button': audioHandler, // 音声挿入ハンドラ
                    'calculator-button': showMathJSInputUI, // ダイス/計算ハンドラ
                    'localvideo-button': localVideoHandler, // 動画挿入ハンドラ
                    'localtext-button': localTextHandler, // 動画挿入ハンドラ
                    'image': imageHandler, // 'image'をオーバーライドする場合
                    'select-line-tool': selectCurrentLine,         // ★ 行選択
                    'select-all-tool': selectAllText,           // ★ 全選択
                    'find-previous-tool': handleFindPreviousTool,  // ★ 前を検
                    'search-tool': handleSearchTool,
                    'find-next-tool': handleFindNextTool,
                    'aa-block': toggleAAMode,
                    'html-download': exportHtml,
                    'text-download': exportText,
                    'image-download': exportImage,
                    'html-mode': codeDisplay,
                    'draw-mode': canvasDisplay,
                    'audio-mode': audioDisplay,
                    // 'video': false // もし標準ビデオボタンを完全に無効化したい場合
                }
            }
        },
        theme: 'snow',
        placeholder: '内容入力してください',
    });

        // ★★★ ここで window オブジェクトに公開 ★★★
        window.quillInstance = quillInstance;
        console.log("Quill instance created and assigned to window.quillInstance:", window.quillInstance);

    // --- ツールバーボタンのツールチップ設定 ---
    function setToolbarButtonTitles(currentQuill) {
        if (!currentQuill) return;
        const toolbar = currentQuill.getModule('toolbar').container;
        if (!toolbar) return;

        const titleMap = {
            'bold': '太字', 'italic': '斜体', 'underline': '下線', 'strike': '取り消し線',
            'blockquote': '引用ブロック', 'code-block': 'コードブロック',
            'link': 'リンク挿入 / 動画埋め込み', // 更新
            'image': '画像挿入',
            // 'video': '動画挿入', // 標準ビデオボタンを使っていないのでコメントアウト
            'formula': '数式挿入',
            'audio-button': '音声挿入',
            'clean': '書式クリア',
            'header': '見出し',
            'font': 'フォント',
            'size': 'フォントサイズ',
            'letterspacing': '文字間隔',
            'color': '文字色',
            'background': '背景色',
            'align': '文字揃え',
            'aa-block': '自動調整で画面幅改行を起こさずAAに適してます',
            'calculator-button': 'ダイス/計算',
            'localvideo-button': '動画挿入',
            'localtext-button': '文書挿入',
            'select-line-tool': '現在の行を選択',     // ★ 追加
            'select-all-tool': 'すべて選択',        // ★ 追加
            'find-previous-tool': '検索した前の文字に移動',
            'search-tool': '文字を検索して選択',  // ★ 追加
            'find-next-tool': '検索した次の文字に移動',
            'html-download': 'htmlとしてダウンロード',
            'text-download': 'txtとしてダウンロード',
            'image-download': '画像としてダウンロード',
            'html-mode': 'HTMLのコードエディターを展開します',
            'draw-mode': '描画機能を展開します',
            'audio-mode': '音編集機能を展開します',
        };

        Object.keys(titleMap).forEach(formatKey => {
            // ボタンのクラス名は ql-{formatKey} (例: ql-bold, ql-link, ql-audio-button)
            // ピッカーの場合は、その親のspan.ql-picker.ql-{formatKey} を探す
            let button;
            if (toolbar.querySelector(`button.ql-${formatKey}`)) {
                button = toolbar.querySelector(`button.ql-${formatKey}`);
            } else if (toolbar.querySelector(`span.ql-picker.ql-${formatKey} .ql-picker-label`)) {
                // ピッカーの場合は、そのラベルにタイトルを設定するか、ピッカー全体に設定
                button = toolbar.querySelector(`span.ql-picker.ql-${formatKey}`); // ピッカー自体
                if (button && !button.title) { // ピッカー自体にタイトルがなければ設定
                    button.title = titleMap[formatKey];
                }
                // さらにピッカーラベルにも設定を試みる (冗長になる可能性もあるが、確実性のため)
                let pickerLabel = toolbar.querySelector(`span.ql-picker.ql-${formatKey} .ql-picker-label`);
                if (pickerLabel && !pickerLabel.title) {
                    pickerLabel.title = titleMap[formatKey];
                }
                return; // ピッカーの場合はここで処理終了
            }


            if (button && !button.title) {
                button.title = titleMap[formatKey];
            }
        });

        // value属性を持つボタンのツールチップ (リスト、インデントなど)
        const valueButtonTitles = {
            'list': { 'ordered': '番号付きリスト', 'bullet': '箇条書きリスト', 'check': 'チェックリスト' },
            'script': { 'sub': '下付き文字', 'super': '上付き文字' },
            'indent': { '-1': 'インデント減', '+1': 'インデント増' },
            'direction': { 'rtl': '右から左へ書字方向変更' }
        };
        Object.keys(valueButtonTitles).forEach(formatGroup => {
            Object.keys(valueButtonTitles[formatGroup]).forEach(value => {
                const button = toolbar.querySelector(`button.ql-${formatGroup}[value="${value}"]`);
                if (button && !button.title) button.title = valueButtonTitles[formatGroup][value];
            });
        });

        // ピッカーの各アイテムのツールチップ
        toolbar.querySelectorAll('.ql-header .ql-picker-item').forEach(item => {
            if (!item.title) item.title = item.dataset.value ? `見出し ${item.dataset.value}` : '標準テキスト';
        });
        const sizeTitleMap = { 'small': '小', 'large': '大', 'huge': '特大' };
        toolbar.querySelectorAll('.ql-size .ql-picker-item').forEach(item => {
            if (!item.title) item.title = item.dataset.value ? (sizeTitleMap[item.dataset.value] || '標準サイズ') : '標準サイズ';
        });

        // フォントピッカーアイテム (HTMLに非表示selectがあればそこから表示名を取得、なければフォールバック)
        const fontSelectElement = document.getElementById('font_family_for_quill_setup'); // このIDを持つ要素がHTMLに存在するか確認
        toolbar.querySelectorAll('.ql-font .ql-picker-item').forEach(item => {
            if (!item.title) {
                const fontValue = item.dataset.value;
                let displayName = fontValue; // デフォルト
                if (fontSelectElement) {
                    const option = fontSelectElement.querySelector(`option[value="${fontValue}"]`);
                    if (option) displayName = option.textContent;
                } else {
                    // フォールバック: fontValueから表示名を推測 (例)
                    if (fontValue === 'sans-serif') displayName = 'ゴシック体 (標準)';
                    else if (fontValue === 'Serif') displayName = '明朝体 (標準)'; // CSSのdata-valueと合わせる
                    else if (fontValue === 'Monospace') displayName = '等幅 (標準)'; // CSSのdata-valueと合わせる
                    else if (fontValue === 'cursive') displayName = '筆記体 (標準)';
                    else if (fontValue === 'fantasy') displayName = '装飾 (標準)';
                    // 他の具体的なフォント名の場合は fontValue をそのまま使うか、適切な表示名を設定
                }
                item.title = displayName;
            }
        });

        // 文字間隔ピッカーアイテム
        toolbar.querySelectorAll('.ql-letterspacing .ql-picker-item').forEach(item => {
            if (!item.title) {
                const val = item.dataset.value;
                if (!val || val === 'false') item.title = '標準の文字間隔';
                else item.title = `文字間隔: ${val}`;
            }
        });

        const alignTitleMap = { 'center': '中央揃え', 'right': '右揃え', 'justify': '両端揃え' };
        toolbar.querySelectorAll('.ql-align .ql-picker-item').forEach(item => {
            if (!item.title) item.title = item.dataset.value ? (alignTitleMap[item.dataset.value] || '左揃え') : '左揃え';
        });
        console.log("Toolbar button titles set.");
    }

    // QuillのツールバーがDOMに描画されるのを待つため、少し長めの遅延
    setTimeout(() => {
        setToolbarButtonTitles(quillInstance);
    }, 500); // ツールバーDOM構築を待つ

    // (オプション) フォーム送信時にQuillの内容を取得する例
    // const form = document.getElementById('create-thread-form'); // フォームのID
    // if (form) {
    //     form.addEventListener('submit', function(event) {
    //         const quillContentInput = document.getElementById('quill-content'); // hidden inputのID
    //         if (quillInstance && quillContentInput) {
    //             quillContentInput.value = quillInstance.root.innerHTML; // HTMLとして取得
    //             // または quillInstance.getContents() でDeltaを取得
    //         }
    //         // ここで event.preventDefault() を呼ぶかどうかは、通常のフォーム送信をするか非同期送信をするかによる
    //     });
    // }





    // // --- 初期実行とイベントリスナー ---
    // setTimeout(() => { // QuillのDOM構築とBlotの準備を待つ
    //     dynamicallyAdjustAllAAStyles(); // 初期ロード時に既存のAAブロックのスタイルを調整
    // }, 1000); // 遅延時間は適宜調整

    setTimeout(adjustGlobalAAStyles, 1000); // 初期ロード時
    let resizeTimeoutAA;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeoutAA);
        resizeTimeoutAA = setTimeout(adjustGlobalAAStyles, 300);
    });
    quillInstance.on('text-change', (delta, oldDelta, source) => {
        if (source === Quill.sources.USER && isAAModeActive) {
            // AAモード中にテキストが変更されたらスタイルを再調整
            // debounce/throttle推奨
            setTimeout(adjustGlobalAAStyles, 50); // 少し遅延させてDelta適用後に
        }
    });




    // --- ファイルダウンロード用ヘルパー関数 (ファイル名入力機能付き) ---
    function downloadToFileWithPrompt(defaultFilename, contentType, contentProvider) {
        // contentProvider は、コンテンツを生成する関数 (例: () => quillInstance.root.innerHTML)
        // これにより、prompt表示中にユーザーがエディタを編集しても、
        // ダウンロード直前の最新のコンテンツを取得できる

        const suggestedFilename = defaultFilename; // promptの初期値として提案するファイル名
        const userFilename = prompt(`ファイル名を入力してください(拡張子の記述は不要)\n※htmlは幾つかのフォントを読み込まないため適応しない場合があります\n※文書して保存する際、拡張子は.txtのみ対応です`, suggestedFilename.substring(0, suggestedFilename.lastIndexOf('.')) || suggestedFilename);

        if (userFilename === null) { // ユーザーがキャンセルした場合
            console.log("ファイルダウンロードがキャンセルされました。");
            return;
        }

        const baseFilename = userFilename.trim() || suggestedFilename.substring(0, suggestedFilename.lastIndexOf('.')) || "download";
        const extension = defaultFilename.split('.').pop() || "txt"; // デフォルトの拡張子
        const finalFilename = `${baseFilename}.${extension}`;

        const content = contentProvider(); // ★ ここでコンテンツを生成/取得

        const a = document.createElement('a');
        const file = new Blob([content], { type: contentType });

        a.href = URL.createObjectURL(file);
        a.download = finalFilename; // ユーザーが指定したファイル名を使用
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            URL.revokeObjectURL(a.href);
            a.remove();
        }, 100);

        alert(`「${finalFilename}」としてファイルがダウンロードされます。`);
    }

    async function exportHtml() {
        let embeddedStyles = `
    .ql-result-text {display: inline-block;padding: 1px 3px;border-radius: 3px;}
    .ql-result-text.ql-result-pristine {background-image: linear-gradient(to right, #ff8a00, #e52e71);color: white;font-weight: bold;}
    .ql-result-text:not(.ql-result-pristine) {background-image: none;color: inherit;font-weight: normal;}
    
    .ql-editor blockquote, .ql-editor h1, .ql-editor h2, .ql-editor h3, .ql-editor h4, .ql-editor h5, .ql-editor h6, .ql-editor ol, .ql-editor p, .ql-editor pre{
    margin:0;
    padding:0;
        line-height: 1.42;
    font-size: 13px;
    }
    
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="sans-serif"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="sans-serif"]::before {
        content: 'ゴシック体 (環境依存標準)';
        font-family: sans-serif;
    }
    .ql-font-sans-serif {
        font-family: sans-serif !important;
    }
    
    /* serif (標準明朝体) */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Serif"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Serif"]::before {
        content: '明朝体 (環境依存標準)';
        font-family: serif;
    }
    .ql-font-serif {
        font-family: serif !important;
    }
    
    /* monospace (標準等幅フォント) */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Monospace"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Monospace"]::before {
        content: '等幅 (環境依存標準)';
        font-family: monospace;
    }
    .ql-font-monospace {
        font-family: monospace !important;
    }
    
    /* cursive (筆記体) */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="cursive"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="cursive"]::before {
        content: '筆記体 (環境依存標準)';
        font-family: cursive;
    }
    .ql-font-cursive {
        font-family: cursive !important;
    }
    
    /* fantasy (装飾フォント) */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="fantasy"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="fantasy"]::before {
        content: '装飾 (環境依存標準)';
        font-family: fantasy;
    }
    .ql-font-fantasy {
        font-family: fantasy !important;
    }
    
    
    /* MS Gothic */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="MS-Gothic"]::before, /* MODIFIED */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="MS-Gothic"]::before {  /* MODIFIED */
        content: 'MSゴシック(AAに適正)';
        font-family: "MS Gothic", "ＭＳ ゴシック", sans-serif;
    }
    .ql-font-MS-Gothic { /* MODIFIED (matches JS allowedFonts) */
        font-family: "MS Gothic", "ＭＳ ゴシック", sans-serif !important;
    }
    
    /* MS Mincho */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="MS-Mincho"]::before, /* MODIFIED */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="MS-Mincho"]::before {  /* MODIFIED */
        content: 'MS明朝';
        font-family: "MS Mincho", "ＭＳ 明朝", serif;
    }
    .ql-font-MS-Mincho { /* MODIFIED */
        font-family: "MS Mincho", "ＭＳ 明朝", serif !important;
    }
    
    /* Yu Gothic */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Yu-Gothic"]::before, /* MODIFIED */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Yu-Gothic"]::before {  /* MODIFIED */
        content: '游ゴシック';
        font-family: "Yu Gothic", "游ゴシック体", "YuGothic", "游ゴシック Medium", sans-serif;
    }
    .ql-font-Yu-Gothic { /* MODIFIED */
        font-family: "Yu Gothic", "游ゴシック体", "YuGothic", "游ゴシック Medium", sans-serif !important;
    }
    
    /* Hiragino Kaku Gothic */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Hiragino-Kaku-Gothic"]::before, /* MODIFIED */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Hiragino-Kaku-Gothic"]::before {  /* MODIFIED */
        content: 'ヒラギノ角ゴシック';
        font-family: "Hiragino Kaku Gothic ProN", "ヒラギノ角ゴ ProN W3", "Hiragino Sans", sans-serif;
    }
    .ql-font-Hiragino-Kaku-Gothic { /* MODIFIED */
        font-family: "Hiragino Kaku Gothic ProN", "ヒラギノ角ゴ ProN W3", "Hiragino Sans", sans-serif !important;
    }
    
    /* Hiragino Mincho */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Hiragino-Mincho"]::before, /* MODIFIED */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Hiragino-Mincho"]::before {  /* MODIFIED */
        content: 'ヒラギノ明朝';
        font-family: "Hiragino Mincho ProN", "ヒラギノ明朝 ProN W3", serif;
    }
    .ql-font-Hiragino-Mincho { /* MODIFIED */
        font-family: "Hiragino Mincho ProN", "ヒラギノ明朝 ProN W3", serif !important;
    }
    
    /* Noto Sans JP */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Noto-Sans-JP"]::before, /* MODIFIED */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Noto-Sans-JP"]::before {  /* MODIFIED */
        content: 'ノト・サンズJP';
        font-family: "Noto Sans JP", sans-serif;
    }
    .ql-font-Noto-Sans-JP { /* MODIFIED */
        font-family: "Noto Sans JP", sans-serif !important;
    }
    
    /* Noto Serif JP */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Noto-Serif-JP"]::before, /* MODIFIED */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Noto-Serif-JP"]::before {  /* MODIFIED */
        content: 'ノト・セリフJP';
        font-family: "Noto Serif JP", serif;
    }
    .ql-font-Noto-Serif-JP { /* MODIFIED */
        font-family: "Noto Serif JP", serif !important;
    }
    
    /* Noto Serif JP */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="IPA-Gothic"]::before, /* MODIFIED */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="IPA-Gothic"]::before {  /* MODIFIED */
        content: 'IPA-Gothic';
        font-family: "IPA Gothic", serif;
    }
    .ql-font-IPA-Gothic { /* MODIFIED */
        font-family: "IPA Gothic", serif !important;
    }
    /* Noto Serif JP */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="IPA-Mincho"]::before, /* MODIFIED */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="IPA-Mincho"]::before {  /* MODIFIED */
        content: 'IPA-Mincho';
        font-family: "IPA Mincho", serif;
    }
    .ql-font-IPA-MinchoP { /* MODIFIED */
        font-family: "IPA Mincho", serif !important;
    }
    
    
    
    /* Planetarium - No change needed as no space */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Planetarium"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Planetarium"]::before {
        content: 'プラネタリウム';
        font-family: "Planetarium", cursive;
    }
    .ql-font-Planetarium {
        font-family: "Planetarium", cursive !important;
    }
    
    /* ChilloutTYP-Regular - No change needed */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="ChilloutTYP-Regular"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="ChilloutTYP-Regular"]::before {
        content: 'チルアウト';
        font-family: "ChilloutTYP-Regular", sans-serif;
    }
    .ql-font-ChilloutTYP-Regular {
        font-family: "ChilloutTYP-Regular", sans-serif !important;
    }
    
    /* Buildingsandundertherailwaytracks-Regular - No change needed */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Buildingsandundertherailwaytracks-Regular"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Buildingsandundertherailwaytracks-Regular"]::before {
        content: 'ビルと谷間と高架下';
        font-family: "Buildingsandundertherailwaytracks-Regular", sans-serif;
    }
    .ql-font-Buildingsandundertherailwaytracks-Regular {
        font-family: "Buildingsandundertherailwaytracks-Regular", sans-serif !important;
    }
    
    /* Dancers - No change needed */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Dancers"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Dancers"]::before {
        content: 'オドリコ';
        font-family: "Dancers", cursive;
    }
    .ql-font-Dancers {
        font-family: "Dancers", cursive !important;
    }
    
    /* HannariMincho-Regular - No change needed */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="HannariMincho-Regular"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="HannariMincho-Regular"]::before {
        content: 'はんなり明朝';
        font-family: "HannariMincho-Regular", serif;
    }
    .ql-font-HannariMincho-Regular {
        font-family: "HannariMincho-Regular", serif !important;
    }
    
    /* Koku Mincho */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Koku-Mincho"]::before, /* MODIFIED */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Koku-Mincho"]::before {  /* MODIFIED */
        content: '刻明朝';
        font-family: "Koku Mincho", serif;
    }
    .ql-font-Koku-Mincho { /* MODIFIED */
        font-family: "Koku Mincho", serif !important;
    }
    
    /* Anzumoji - No change needed */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Anzumoji"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Anzumoji"]::before {
        content: 'あんずもじ';
        font-family: "Anzumoji", cursive;
    }
    .ql-font-Anzumoji {
        font-family: "Anzumoji", cursive !important;
    }
    
    /* Onryou - No change needed */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Onryou"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Onryou"]::before {
        content: '怨霊';
        font-family: "Onryou", cursive;
    }
    .ql-font-Onryou {
        font-family: "Onryou", cursive !important;
    }
    
    /* Kowai - No change needed */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Kowai"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Kowai"]::before {
        content: 'ふぉんとうは怖い明朝体';
        font-family: "Kowai", serif;
    }
    .ql-font-Kowai {
        font-family: "Kowai", serif !important;
    }
    
    /* Reggae One */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Reggae-One"]::before, /* MODIFIED */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Reggae-One"]::before {  /* MODIFIED */
        content: 'レゲエOne';
        font-family: "Reggae One", cursive;
    }
    .ql-font-Reggae-One { /* MODIFIED */
        font-family: "Reggae One", cursive !important;
    }
    
    /* Ankoku - No change needed */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Ankoku"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Ankoku"]::before {
        content: '暗黒ゾン字';
        font-family: "Ankoku", cursive;
    }
    .ql-font-Ankoku {
        font-family: "Ankoku", cursive !important;
    }
    
    /* Chikara Duyoku */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Chikara-Duyoku"]::before, /* MODIFIED */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Chikara-Duyoku"]::before {  /* MODIFIED */
        content: 'チカラヅヨク';
        font-family: "Chikara Duyoku", sans-serif;
    }
    .ql-font-Chikara-Duyoku { /* MODIFIED */
        font-family: "Chikara Duyoku", sans-serif !important;
    }
    
    /* Chikara Yowaku */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Chikara-Yowaku"]::before, /* MODIFIED */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Chikara-Yowaku"]::before {  /* MODIFIED */
        content: 'チカラヨワク';
        font-family: "Chikara Yowaku", sans-serif;
    }
    .ql-font-Chikara-Yowaku { /* MODIFIED */
        font-family: "Chikara Yowaku", sans-serif !important;
    }
    
    
    /* == アスキーアート用 == */
    
    /* Mona - No change needed */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Mona"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Mona"]::before {
        content: 'モナ(AAに適正)';
        font-family: "Mona", "Monapo", "IPAMonaPGothic", "MS PGothic", monospace;
    }
    .ql-font-Mona {
        font-family: "Mona", "Monapo", "IPAMonaPGothic", "MS PGothic", monospace !important;
    }
    
    
    /* == 日本語未対応フォント == */
    
    /* Arial - No change needed */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Arial"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Arial"]::before {
        content: 'アリアル(欧文)';
        font-family: Arial, Helvetica, sans-serif;
    }
    .ql-font-Arial {
        font-family: Arial, Helvetica, sans-serif !important;
    }
    
    /* Verdana - No change needed */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Verdana"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Verdana"]::before {
        content: 'ヴァーダナ(欧文)';
        font-family: Verdana, Geneva, sans-serif;
    }
    .ql-font-Verdana {
        font-family: Verdana, Geneva, sans-serif !important;
    }
    
    /* Georgia - No change needed */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Georgia"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Georgia"]::before {
        content: 'ジョージア(欧文)';
        font-family: Georgia, serif;
    }
    .ql-font-Georgia {
        font-family: Georgia, serif !important;
    }
    
    /* Times New Roman */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Times-New-Roman"]::before, /* MODIFIED */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Times-New-Roman"]::before {  /* MODIFIED */
        content: 'タイムズ・ニュー・ロマン(欧文)';
        font-family: "Times New Roman", Times, serif;
    }
    .ql-font-Times-New-Roman { /* MODIFIED */
        font-family: "Times New Roman", Times, serif !important;
    }
    
    /* Impact - No change needed */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Impact"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Impact"]::before {
        content: 'インパクト(欧文)';
        font-family: Impact, Charcoal, sans-serif;
    }
    .ql-font-Impact {
        font-family: Impact, Charcoal, sans-serif !important;
    }
    
    /* Trebuchet MS */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Trebuchet-MS"]::before, /* MODIFIED */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Trebuchet-MS"]::before {  /* MODIFIED */
        content: 'トレブチェットMS(欧文)';
        font-family: "Trebuchet MS", Helvetica, sans-serif;
    }
    .ql-font-Trebuchet-MS { /* MODIFIED */
        font-family: "Trebuchet MS", Helvetica, sans-serif !important;
    }
    
    /* Palatino Linotype */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Palatino-Linotype"]::before, /* MODIFIED */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Palatino-Linotype"]::before {  /* MODIFIED */
        content: 'パラティーノ・リノタイプ(欧文)';
        font-family: "Palatino Linotype", "Book Antiqua", Palatino, serif;
    }
    .ql-font-Palatino-Linotype { /* MODIFIED */
        font-family: "Palatino Linotype", "Book Antiqua", Palatino, serif !important;
    }
    
    /* Tahoma - No change needed */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Tahoma"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Tahoma"]::before {
        content: 'タホマ(欧文)';
        font-family: Tahoma, Geneva, sans-serif;
    }
    .ql-font-Tahoma {
        font-family: Tahoma, Geneva, sans-serif !important;
    }
    
    /* Segoe UI */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Segoe-UI"]::before, /* MODIFIED */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Segoe-UI"]::before {  /* MODIFIED */
        content: 'セゴエUI(欧文)';
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    }
    .ql-font-Segoe-UI { /* MODIFIED */
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
    }
    
    /* Comic Sans MS */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Comic-Sans-MS"]::before, /* MODIFIED */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Comic-Sans-MS"]::before {  /* MODIFIED */
        content: 'コミック・サンズMS(欧文)';
        font-family: "Comic Sans MS", cursive, sans-serif;
    }
    .ql-font-Comic-Sans-MS { /* MODIFIED */
        font-family: "Comic Sans MS", cursive, sans-serif !important;
    }
    
    /* Roboto - No change needed */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Roboto"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Roboto"]::before {
        content: 'ロボト(欧文)';
        font-family: "Roboto", sans-serif;
    }
    .ql-font-Roboto {
        font-family: "Roboto", sans-serif !important;
    }
    
    /* Open Sans */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Open-Sans"]::before, /* MODIFIED */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Open-Sans"]::before {  /* MODIFIED */
        content: 'オープン・サンズ(欧文)';
        font-family: "Open Sans", sans-serif;
    }
    .ql-font-Open-Sans { /* MODIFIED */
        font-family: "Open Sans", sans-serif !important;
    }
    
    /* Noto Sans - No change needed */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Noto-Sans"]::before, /* MODIFIED (if you changed it in JS) */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Noto-Sans"]::before {  /* MODIFIED (if you changed it in JS) */
        content: 'ノト・サンズ(欧文)';
        font-family: "Noto Sans", sans-serif;
    }
    .ql-font-Noto-Sans { /* MODIFIED (if you changed it in JS) */
        font-family: "Noto Sans", sans-serif !important;
    }
    
    
    /* Montserrat - No change needed */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Montserrat"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Montserrat"]::before {
        content: 'モントセラト(欧文)';
        font-family: "Montserrat", sans-serif;
    }
    .ql-font-Montserrat {
        font-family: "Montserrat", sans-serif !important;
    }
    
    /* Lato - No change needed */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Lato"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Lato"]::before {
        content: 'ラトー(欧文)';
        font-family: "Lato", sans-serif;
    }
    .ql-font-Lato {
        font-family: "Lato", sans-serif !important;
    }
    
    /* Roboto Flex */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Roboto-Flex"]::before, /* MODIFIED */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Roboto-Flex"]::before {  /* MODIFIED */
        content: 'ロボト・フレックス(欧文)';
        font-family: "Roboto Flex", sans-serif;
    }
    .ql-font-Roboto-Flex { /* MODIFIED */
        font-family: "Roboto Flex", sans-serif !important;
    }
    
    /* Inter - No change needed */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Inter"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Inter"]::before {
        content: 'インター(欧文)';
        font-family: "Inter", sans-serif;
    }
    .ql-font-Inter {
        font-family: "Inter", sans-serif !important;
    }
    
    /* Regular (Typing Art Regular) - No change needed */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Regular"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Regular"]::before {
        content: 'タイピングアート・レギュラー(欧文)';
        font-family: "Typing Art Regular", monospace;
    }
    .ql-font-Regular {
        font-family: "Typing Art Regular", monospace !important;
    }
    
    /* Dancing Script */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Dancing-Script"]::before, /* MODIFIED */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Dancing-Script"]::before {  /* MODIFIED */
        content: 'ダンシング・スクリプト(欧文)';
        font-family: "Dancing Script", cursive;
    }
    .ql-font-Dancing-Script { /* MODIFIED */
        font-family: "Dancing Script", cursive !important;
    }
    
    /* Orbitron - No change needed */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Orbitron"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Orbitron"]::before {
        content: 'オービトロン(欧文)';
        font-family: "Orbitron", sans-serif;
    }
    .ql-font-Orbitron {
        font-family: "Orbitron", sans-serif !important;
    }
    
    /* Press Start 2P */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Press-Start-2P"]::before, /* MODIFIED */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Press-Start-2P"]::before {  /* MODIFIED */
        content: 'プレススタート2P(欧文)';
        font-family: "Press Start 2P", cursive;
    }
    .ql-font-Press-Start-2P { /* MODIFIED */
        font-family: "Press Start 2P", cursive !important;
    }
    
    /* Bungee - No change needed */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Bungee"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Bungee"]::before {
        content: 'バンジー(欧文)';
        font-family: "Bungee", cursive;
    }
    .ql-font-Bungee {
        font-family: "Bungee", cursive !important;
    }
    
    /* Lobster - No change needed */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Lobster"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Lobster"]::before {
        content: 'ロブスター(欧文)';
        font-family: "Lobster", cursive;
    }
    .ql-font-Lobster {
        font-family: "Lobster", cursive !important;
    }
    
    /* Bubblegum Sans */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Bubblegum-Sans"]::before, /* MODIFIED */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Bubblegum-Sans"]::before {  /* MODIFIED */
        content: 'バブルガム・サンズ(欧文)';
        font-family: "Bubblegum Sans", cursive;
    }
    .ql-font-Bubblegum-Sans { /* MODIFIED */
        font-family: "Bubblegum Sans", cursive !important;
    }
    
    /* Courier New */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Courier-New"]::before, /* MODIFIED */
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Courier-New"]::before {  /* MODIFIED */
        content: 'クーリエ・ニュー(欧文等幅)';
        font-family: "Courier New", Courier, monospace;
    }
    .ql-font-Courier-New { /* MODIFIED */
        font-family: "Courier New", Courier, monospace !important;
    }
    
    /* Monaco - No change needed */
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Monaco"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Monaco"]::before {
        content: 'モナコ(欧文等幅)';
        font-family: Monaco, Consolas, "Lucida Console", monospace;
    }
    .ql-font-Monaco {
        font-family: Monaco, Consolas, "Lucida Console", monospace !important;
    }`;

        // --- 埋め込むCSSソースの指定 ---
        const cssUrlsToEmbed = [
            // 例1: Quillの基本的なSnowテーマのCSS (CDNから取得)
            // 注意: これを含めるとファイルサイズが大きくなります。必要な部分だけを抜粋するか、
            //       HTML単体で表示する際に最低限必要なスタイルのみに絞るのが良いでしょう。
            // 'https://cdnjs.cloudflare.com/ajax/libs/quill/2.0.2/quill.snow.min.css',

            // 例2: あなたが作成した、エクスポート専用のスタイルシートのパス
            // 'path/to/your/quill-embed-styles.css', // 実際のパスに置き換えてください

            // 例3: 外部の汎用CSSフレームワークの一部など (必要な場合)
            // 'https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css' // (これは非常に大きいので非推奨)
        ];

        // 外部CSSファイルの読み込み
        for (const url of cssUrlsToEmbed) {
            embeddedStyles += await getCssContent(url) + "\n";
        }

        // HTML内の特定の<style>タグの内容を取得して埋め込む
        const inlineStyleElement = document.getElementById('quill-inline-styles-for-export');
        if (inlineStyleElement) {
            embeddedStyles += inlineStyleElement.innerHTML + "\n";
        }

        // (オプション) Quillエディタ自体のフォントファミリーや基本スタイルも取得して含める
        // const editorElement = quillInstance.root;
        // const editorComputedStyle = getComputedStyle(editorElement);
        // embeddedStyles += `body { font-family: ${editorComputedStyle.fontFamily}; font-size: ${editorComputedStyle.fontSize}; line-height: ${editorComputedStyle.lineHeight}; color: ${editorComputedStyle.color}; background-color: ${editorComputedStyle.backgroundColor}; }`;
        // embeddedStyles += `.ql-editor { padding: ${editorComputedStyle.padding}; }`; // .ql-editor のpaddingなど

        // QuillのコンテンツHTMLを取得
        const quillContentHtml = quillInstance.root.innerHTML;

        // 最終的なHTML文字列を生成
        const fullHtmlContent = `<!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Exported Content</title>
                <!-- Google Fonts (Noto Sans JP) -->
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
        
            <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@100;300;400;500;700;900&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700;800&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;700&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;700;900&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;300;400;500;700;900&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Lato:wght@100;300;400;700;900&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wght@8..144,100..900&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
        
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400..700&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400..900&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Bungee&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Lobster&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Bubblegum+Sans&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Reggae+One&display=swap" rel="stylesheet">
        <style>
            ${embeddedStyles}
        </style>
    </head>
    <body>
        <div class="ql-container ql-snow" style="border: none;">
            <div class="ql-editor">
                ${quillContentHtml}
            </div>
        </div>
    </body>
    </html>`;


        console.log("Full HTML Content with Embedded Styles:", fullHtmlContent);

        downloadToFileWithPrompt(
            'content.html',
            'text/html;charset=utf-8',
            () => fullHtmlContent // ★ 生成した完全なHTMLを渡す
        );
        // alert('スタイルが埋め込まれたHTMLファイルがダウンロードされます。'); // downloadToFileWithPrompt内でalertが出るはず

    }
    function exportText() {
        if (!quillInstance) return;
        // ★ downloadToFileWithPrompt を使用
        downloadToFileWithPrompt(
            'content.txt',
            'text/plain;charset=utf-8',
            () => quillInstance.getText() // コンテンツを提供する関数
        );
    }
    function exportImage() {
        if (!quillInstance) return;
        if (typeof html2canvas === 'undefined') {
            alert("画像出力機能に必要なライブラリ (html2canvas) が読み込まれていません。");
            return;
        }

        const defaultImageNameBase = 'capture';
        let userFilenameBase = prompt(`画像ファイル名を入力してください(拡張子は不要です)`, defaultImageNameBase);

        if (userFilenameBase === null) {
            console.log("画像ダウンロードがキャンセルされました (ファイル名入力)。");
            return;
        }
        userFilenameBase = userFilenameBase.trim() || defaultImageNameBase;

        // --- 拡張子選択 ---
        let imageType = 'image/png'; // デフォルト
        let extension = 'png';
        const supportedExtensions = ['png', 'jpeg', 'gif', 'webp']; // webpはhtml2canvasの直接サポート外だがcanvas経由なら可能

        // 簡易的な拡張子選択 (promptを使用)
        const choiceMessage = "保存する画像の形式を選択してください:\n" +
            "1: PNG (高品質、透過対応)\n" +
            "2: JPEG (写真向き、ファイルサイズ小)\n" +
            "3: GIF (アニメーション非対応、色数制限)\n" +
            "4: WebP (高品質、高圧縮、新しい形式)\n" +
            "番号を入力してください (1-4):";
        const choice = prompt(choiceMessage, "1");

        if (choice === null) {
            console.log("画像ダウンロードがキャンセルされました (形式選択)。");
            return;
        }
        switch (choice) {
            case '1':
                imageType = 'image/png';
                extension = 'png';
                break;
            case '2':
                imageType = 'image/jpeg';
                extension = 'jpeg'; // または 'jpg'
                break;
            case '3':
                // html2canvasはアニメーションGIFは生成できない。静止GIFとして出力される。
                imageType = 'image/gif';
                extension = 'gif';
                break;
            case '4':
                // canvas.toDataURL('image/webp') はブラウザのサポートに依存
                if (document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0) {
                    imageType = 'image/webp';
                    extension = 'webp';
                } else {
                    alert("お使いのブラウザはWebP形式の出力をサポートしていません。PNGで保存します。");
                    imageType = 'image/png'; // フォールバック
                    extension = 'png';
                }
                break;
            default:
                alert("無効な選択です。PNG形式で保存します。");
                imageType = 'image/png';
                extension = 'png';
        }

        const finalImageName = `${userFilenameBase}.${extension}`;

        const editorElement = quillInstance.root;
        const originalScrollTop = editorElement.scrollTop;
        const originalOverflow = editorElement.style.overflow;
        editorElement.scrollTop = 0;
        editorElement.style.overflow = 'hidden';

        html2canvas(editorElement, {
            allowTaint: true,
            useCORS: true,
            backgroundColor: (imageType === 'image/jpeg' || imageType === 'image/webp') ? "#ffffff" : null, // JPEG/WebPは透過をサポートしないので背景色指定
        }).then(canvas => {
            editorElement.scrollTop = originalScrollTop;
            editorElement.style.overflow = originalOverflow;



            const link = document.createElement('a');
            link.download = finalImageName;
            // ★ canvas.toDataURLに選択されたimageTypeを渡す
            //    JPEGの場合、品質も指定できる (例: canvas.toDataURL('image/jpeg', 0.9))
            let dataUrl = canvas.toDataURL(imageType, (imageType === 'image/jpeg' || imageType === 'image/webp') ? 0.90 : undefined);
            link.href = dataUrl.replace(imageType, "image/octet-stream"); // ダウンロード強制
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log(`Image captured as ${finalImageName} and download initiated.`);
            alert(`「${finalImageName}」として画像ファイルがダウンロードされます。`);

        }).catch(error => {
            editorElement.scrollTop = originalScrollTop;
            editorElement.style.overflow = originalOverflow;
            console.error("Error capturing image:", error);
            alert("画像の生成に失敗しました。コンソールを確認してください。");
        });
    }

    // --- CSSコンテンツを取得する非同期関数 ---
    async function getCssContent(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch CSS: ${response.status} ${response.statusText}`);
            }
            return await response.text();
        } catch (error) {
            console.error(`Error fetching CSS from ${url}:`, error);
            return ""; // エラー時は空文字を返す
        }
    }



