document.addEventListener('DOMContentLoaded', () => {
    const consentBanner = document.getElementById('cookie-consent-banner');
    const acceptButton = document.getElementById('accept-cookies-btn');
    const declineButton = document.getElementById('decline-cookies-btn');
    const consentCookieName = 'user_cookie_consent';

/**
 * クッキーを設定します。
 * @param {string} name 設定するクッキーの名前。
 * @param {string} value 設定するクッキーの値。
 * @param {object} [options={}] クッキーのオプション。
 * @param {number} [options.days] 有効期限（日数）。指定しない場合はセッションクッキー。
 * @param {string} [options.path='/'] クッキーが有効なパス。デフォルトはルートパス。
 * @param {string} [options.domain] クッキーが有効なドメイン。
 * @param {boolean} [options.secure=false] HTTPS接続でのみ送信するかどうか。本番環境ではtrueを推奨。
 * @param {'Strict'|'Lax'|'None'} [options.sameSite='Lax'] SameSite属性。'None'の場合はsecure=trueが必須。
 */
function setCookie(name, value, options = {}) {
    if (typeof document === 'undefined') {
        // ブラウザ環境でない場合は何もしない
        return;
    }

    let cookieString = encodeURIComponent(name) + "=" + encodeURIComponent(value);

    // 有効期限 (Max-Ageを優先し、なければExpires)
    if (typeof options.days === 'number') {
        const date = new Date();
        date.setTime(date.getTime() + (options.days * 24 * 60 * 60 * 1000));
        // cookieString += "; expires=" + date.toUTCString(); // Max-Age を使うのでこちらはコメントアウトでも可
        cookieString += "; Max-Age=" + (options.days * 24 * 60 * 60);
    } else if (options.days === 0) { // 0日を指定したら即時削除
        cookieString += "; Max-Age=0";
    }
    // options.days が undefined ならセッションクッキー (Max-Age/Expiresなし)

    // パス
    cookieString += "; path=" + (options.path || "/");

    // ドメイン
    if (options.domain) {
        cookieString += "; domain=" + options.domain;
    }

    // Secure属性
    // 本番環境(HTTPS)では options.secure = true とすることを強く推奨
    // 開発環境(HTTP)で secure=true にするとクッキーが設定されないことがある
    if (options.secure === true || (options.secure !== false && window.location.protocol === 'https:')) {
        cookieString += "; Secure";
    }


    // SameSite属性
    const sameSiteValue = options.sameSite || 'Lax'; // デフォルトはLax
    if (['Strict', 'Lax', 'None'].includes(sameSiteValue)) {
        cookieString += "; SameSite=" + sameSiteValue;
        // SameSite=None の場合は Secure 属性が必須 (RFCで規定)
        if (sameSiteValue === 'None' && !cookieString.includes("; Secure")) {
            // Secure属性が付いていなければ、SameSite=Noneは無視されるか、Laxとして扱われる可能性
            console.warn("SameSite=None requires the Secure attribute. Cookie might not be set as intended or will be treated as Lax.");
            // 強制的にSecureを付与する、またはエラーにするなどの対応も考えられる
            // if (window.location.protocol === 'https:'){
            //     cookieString += "; Secure";
            // } else {
            //     console.error("Cannot set SameSite=None without Secure attribute over HTTP.");
            //     return; // 設定しない
            // }
        }
    } else {
        console.warn(`Invalid SameSite value: ${options.sameSite}. Defaulting to Lax.`);
        cookieString += "; SameSite=Lax";
    }

    // (オプション) HttpOnly属性はJavaScriptからは設定できません。サーバーサイドで設定します。

    document.cookie = cookieString;
    console.log("Cookie set:", cookieString);
}
/**
 * 指定された名前のクッキーの値を取得します。
 * @param {string} name 取得したいクッキーの名前。
 * @returns {string|null} クッキーの値。見つからない場合は null を返します。
 */
function getCookie(name) {
    if (typeof document === 'undefined' || !document.cookie) {
        // ブラウザ環境でない場合や、クッキーが一切ない場合は null
        return null;
    }

    const nameEQ = name + "=";
    // document.cookie は "name1=value1; name2=value2; ..." のような文字列
    const ca = document.cookie.split(';'); // セミコロンで各クッキーに分割

    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        // 先頭の空白文字を削除 (例: "; foo=bar" のようになることがあるため)
        while (c.charAt(0) === ' ') {
            c = c.substring(1, c.length);
        }
        // クッキー名が一致するか確認
        if (c.indexOf(nameEQ) === 0) {
            // name= の部分を除いた値の部分を返す
            let value = c.substring(nameEQ.length, c.length);
            // (オプション) 保存時にエンコードされている可能性がある場合はデコード
            try {
                return decodeURIComponent(value);
            } catch (e) {
                // デコードに失敗した場合はそのままの値を返す (またはエラー処理)
                console.warn(`Failed to decode cookie value for ${name}:`, value, e);
                return value;
            }
        }
    }
    // 指定された名前のクッキーが見つからなかった場合
    return null;
}


    const consentStatus = getCookie(consentCookieName);

    if (!consentStatus) { // まだ同意/拒否の選択がされていない場合
        if (consentBanner) consentBanner.style.display = 'block';
    } else if (consentStatus === 'accepted') {
        console.log('Cookie consent previously accepted.');
        // ここでクッキーを利用する機能を初期化
        // initializeTrackingCookies();
        // initializePersonalization();
    } else { // 'declined' or other
        console.log('Cookie consent previously declined or unknown status.');
        // クッキーを利用しない機能のみを提供
    }

    if (acceptButton && consentBanner) {
        acceptButton.addEventListener('click', () => {
            setCookie(consentCookieName, 'accepted', 365); // 1年間同意を記憶
            consentBanner.style.display = 'none';
            alert('クッキーの使用に同意しました。');
            // ここでクッキーを利用する機能を初期化
            // initializeTrackingCookies();
            // initializePersonalization();
        });
    }

    if (declineButton && consentBanner) {
        declineButton.addEventListener('click', () => {
            setCookie(consentCookieName, 'declined', 365); // 1年間拒否を記憶
            consentBanner.style.display = 'none';
            alert('クッキーの使用に同意しませんでした。一部機能が制限される場合があります。');
        });
    }
});