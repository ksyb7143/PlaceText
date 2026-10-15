#target illustrator

/**
 * PlaceText - Adobe Illustrator Text Batch Placement Script
 * @version 0.2.0
 * @build 2026-10-15 21:58:53
 * @license MIT
 */

(function () {

// =========================================================
// MODULE: core\config.jsx
// =========================================================
/**
 * PlaceText - core/config.jsx
 * 設定管理モジュール（バージョン定義、初期値、単位換算、JSON永続化）
 */

var PlaceTextConfig = (function () {

    var APP_NAME = "PlaceText";
    var APP_VERSION = "0.2.0";

    var DEFAULT_SETTINGS = {
        // 判定モード: "auto" | "all_point" | "all_area"
        detectMode: "auto",

        // 境界判定設定 (解釈A)
        boundaryMode: "or",       // "or" | "and"
        useBoundaryMarker: false, // 特定の境界マーカーを使用するか
        boundaryMarker: "---",    // 境界マーカー文字列 (半角英数記号5文字以内)
        useBlankLines: true,      // 空行による境界判定を使用するか
        blankLinesCount: 1,       // 境界とする空行の数

        // エリア内文字判定設定
        useCharThreshold: true,   // 文字数閾値を使用するか
        autoTagThreshold: 30,     // これ以上の文字数をエリア内文字と判定

        // ポイント文字設定
        pointSize: 14,
        pointSizeUnit: "pt", // "pt" | "mm" | "inch"
        pointFont: "",       // "" = デフォルト (未指定)

        // エリア内文字設定
        areaSize: 10,
        areaSizeUnit: "pt",
        areaWidth: 300,
        areaWidthUnit: "pt",
        areaHeight: 0,
        areaHeightUnit: "pt", // 0は自動
        areaFont: "",        // "" = デフォルト (未指定)

        // 配置設定
        spacing: 20,
        spacingUnit: "pt",
        baseMode: "selection", // "selection" | "artboard"
        artboardMarginX: 30,
        artboardMarginY: 30,
        textOrientation: "horizontal" // "horizontal" (横書き) | "vertical" (縦書き)
    };

    // 単位変換係数 (基準: pt)
    var UNIT_FACTORS = {
        "pt": 1.0,
        "mm": 72.0 / 25.4, // 約 2.83464567
        "inch": 72.0,
        "in": 72.0
    };

    /**
     * 指定単位の数値を pt に変換
     */
    function toPt(val, unit) {
        var num = parseFloat(val);
        if (isNaN(num)) return 0;
        var u = (unit || "pt").toLowerCase();
        var factor = UNIT_FACTORS[u] || 1.0;
        return num * factor;
    }

    /**
     * pt の数値を指定単位に変換
     */
    function fromPt(ptVal, unit) {
        var num = parseFloat(ptVal);
        if (isNaN(num)) return 0;
        var u = (unit || "pt").toLowerCase();
        var factor = UNIT_FACTORS[u] || 1.0;
        return num / factor;
    }

    function getSettingsFolder() {
        var folder = new Folder(Folder.userData + "/PlaceText");
        if (!folder.exists) {
            folder.create();
        }
        return folder;
    }

    function getSettingsFile() {
        return new File(getSettingsFolder().fsName + "/settings.json");
    }

    // ExtendScript用 簡易JSONエンコーダ
    function stringify(obj) {
        var t = typeof obj;
        if (t !== "object" || obj === null) {
            if (t === "string") return '"' + obj.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r") + '"';
            return String(obj);
        }
        var json = [];
        var isArr = (obj && obj.constructor === Array);
        for (var n in obj) {
            if (obj.hasOwnProperty(n)) {
                var v = obj[n];
                var vt = typeof v;
                if (vt === "function" || vt === "undefined") continue;
                var valStr = stringify(v);
                json.push((isArr ? "" : '"' + n + '":') + valStr);
            }
        }
        return (isArr ? "[" : "{") + json.join(",") + (isArr ? "]" : "}");
    }

    // ExtendScript用 簡易JSONデコーダ
    function parse(jsonStr) {
        if (!jsonStr) return null;
        try {
            return eval("(" + jsonStr + ")");
        } catch (e) {
            return null;
        }
    }

    function cloneSettings(src) {
        var target = {};
        for (var key in DEFAULT_SETTINGS) {
            if (DEFAULT_SETTINGS.hasOwnProperty(key)) {
                target[key] = (src && src.hasOwnProperty(key)) ? src[key] : DEFAULT_SETTINGS[key];
            }
        }
        return target;
    }

    function loadSettings() {
        var file = getSettingsFile();
        if (!file.exists) {
            return cloneSettings(DEFAULT_SETTINGS);
        }
        try {
            file.encoding = "UTF-8";
            file.open("r");
            var content = file.read();
            file.close();
            var parsed = parse(content);
            return cloneSettings(parsed);
        } catch (e) {
            return cloneSettings(DEFAULT_SETTINGS);
        }
    }

    function saveSettings(settings) {
        var file = getSettingsFile();
        try {
            file.encoding = "UTF-8";
            file.open("w");
            file.write(stringify(settings));
            file.close();
            return true;
        } catch (e) {
            return false;
        }
    }

    return {
        APP_NAME: APP_NAME,
        APP_VERSION: APP_VERSION,
        DEFAULT_SETTINGS: DEFAULT_SETTINGS,
        toPt: toPt,
        fromPt: fromPt,
        loadSettings: loadSettings,
        saveSettings: saveSettings,
        cloneSettings: cloneSettings
    };
})();


// =========================================================
// MODULE: core\errors.jsx
// =========================================================
/**
 * PlaceText - core/errors.jsx
 * エラーコード定義およびエラーハンドリングモジュール
 */

var PlaceTextErrors = (function () {

    var CODES = {
        NO_DOCUMENT: "ERR_001",
        TARGET_LAYER_INVALID: "ERR_002",
        EMPTY_TEXT: "ERR_003",
        PARSE_FAILED: "ERR_004",
        LAYOUT_FAILED: "ERR_005",
        FILE_IO_FAILED: "ERR_006",
        PREVIEW_FAILED: "ERR_007",
        CONFIG_FAILED: "ERR_008"
    };

    var MESSAGES = {};
    MESSAGES[CODES.NO_DOCUMENT] = "ドキュメントが開かれていません。アートボードを開いてから実行してください。";
    MESSAGES[CODES.TARGET_LAYER_INVALID] = "編集可能なレイヤーが見つかりません。レイヤーが非表示またはロックされていないか確認してください。";
    MESSAGES[CODES.EMPTY_TEXT] = "配置するテキストがありません。テキストを入力してください。";
    MESSAGES[CODES.PARSE_FAILED] = "テキストのタグ構文解析に失敗しました。";
    MESSAGES[CODES.LAYOUT_FAILED] = "テキストオブジェクトの生成またはレイアウト配置に失敗しました。";
    MESSAGES[CODES.FILE_IO_FAILED] = "ファイルの読み込みに失敗しました。";
    MESSAGES[CODES.PREVIEW_FAILED] = "プレビューの生成処理に失敗しました。";
    MESSAGES[CODES.CONFIG_FAILED] = "設定の読み込みまたは保存に失敗しました。";

    function formatMessage(code, detailMsg, lineNo) {
        var base = MESSAGES[code] || "不明なエラーが発生しました。";
        var res = "[" + code + "] " + base;
        if (detailMsg) {
            res += "\n詳細: " + detailMsg;
        }
        if (lineNo) {
            res += " (行: " + lineNo + ")";
        }
        return res;
    }

    function showAlert(code, detailMsg, lineNo) {
        var msg = formatMessage(code, detailMsg, lineNo);
        alert(msg);
    }

    return {
        CODES: CODES,
        MESSAGES: MESSAGES,
        formatMessage: formatMessage,
        showAlert: showAlert
    };
})();


// =========================================================
// MODULE: core\parser.jsx
// =========================================================
/**
 * PlaceText - core/parser.jsx
 * 構文解析モジュール（空行・マーカー分割、OR/AND境界条件、バリデーション、自動タグ付け、タグ解析）
 */

var PlaceTextParser = (function () {

    function cleanText(str) {
        if (!str) return "";
        str = str.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        str = str.replace(/^\n+/, "").replace(/\n+$/, "");
        return str;
    }

    /**
     * 境界マーカー文字列の技術的バリデーション
     * @param {string} marker 検査対象マーカー
     * @returns {Object} { valid: boolean, message: string }
     */
    function validateBoundaryMarker(marker) {
        if (!marker || marker.length === 0) {
            return { valid: false, message: "マーカーを入力してください" };
        }
        if (marker.length > 5) {
            return { valid: false, message: "半角5文字以内で入力してください (現在 " + marker.length + " 文字)" };
        }
        // 空白・改行の禁止
        if (/\s/.test(marker)) {
            return { valid: false, message: "空白や改行は含められません" };
        }
        // [ または ] の禁止（タグ構文との衝突回避）
        if (/[\[\]]/.test(marker)) {
            return { valid: false, message: "[ または ] はタグ構文と衝突するため使用できません" };
        }
        // 非ASCII（全角文字）の禁止
        if (/[^\x20-\x7E]/.test(marker)) {
            return { valid: false, message: "半角英数・記号のみ使用できます" };
        }

        return { valid: true, message: "使用可能です" };
    }

    /**
     * 単位文字列付き数値を pt にパース (例: "14pt" -> 14, "8mm" -> 22.677, "2inch" -> 144)
     */
    function parseUnit(valStr, defaultVal) {
        if (!valStr) return defaultVal;
        var s = String(valStr).replace(/\s+/g, "").toLowerCase();
        var num = parseFloat(s);
        if (isNaN(num)) return defaultVal;

        if (s.indexOf("mm") !== -1) {
            return num * (72.0 / 25.4);
        } else if (s.indexOf("inch") !== -1 || s.indexOf("in") !== -1) {
            return num * 72.0;
        }
        return num; // pt or unitless
    }

    /**
     * 正規表現エスケープ
     */
    function escapeRegex(str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    }

    /**
     * テキストを解釈A（OR検索/AND検索、マーカー、空行数）に基づいてブロック分割
     */
    function splitBlocks(text, settings) {
        if (!text) return [];

        var useMarker = (settings.useBoundaryMarker === true) && (settings.boundaryMarker && settings.boundaryMarker.length > 0);
        var useLines = (settings.useBlankLines !== false);
        var linesCount = parseInt(settings.blankLinesCount, 10) || 1;
        var isAndMode = (settings.boundaryMode === "and");

        var rawBlocks = [];

        if (useMarker && useLines) {
            var marker = settings.boundaryMarker.replace(/^\s+/, "").replace(/\s+$/, "");
            var escapedMarker = escapeRegex(marker);

            if (isAndMode) {
                // AND検索: マーカー行の前後に指定数以上の空行がある場合のみ境界とする
                var andLinesPattern = (linesCount <= 1) ? "\\n\\s*\\n+" : "(?:\\n\\s*){" + (linesCount + 1) + ",}";
                var andRegex = new RegExp(andLinesPattern + "\\s*" + escapedMarker + "\\s*" + andLinesPattern, "g");
                var andParts = text.split(andRegex);
                for (var a = 0; a < andParts.length; a++) {
                    var blkAnd = cleanText(andParts[a]);
                    if (blkAnd.length > 0 && blkAnd !== marker) rawBlocks.push(blkAnd);
                }
            } else {
                // OR検索: 指定数以上の空行、またはマーカー行（前後の空行を吸収）のいずれかで分割
                var orMarkerPattern = "(?:^|\\n)(?:\\s*\\n)*\\s*" + escapedMarker + "\\s*(?:\\n\\s*)*(?:\\n|$)";
                var orLinesPattern = (linesCount <= 1) ? "\\n\\s*\\n+" : "\\n(?:\\s*\\n){" + linesCount + ",}";
                // マーカー行パターンを優先してマッチさせる
                var orRegex = new RegExp("(?:" + orMarkerPattern + "|" + orLinesPattern + ")", "g");

                var orParts = text.split(orRegex);
                for (var o = 0; o < orParts.length; o++) {
                    var blkOr = cleanText(orParts[o]);
                    if (blkOr.length > 0 && blkOr !== marker) rawBlocks.push(blkOr);
                }
            }
        } else if (useMarker) {
            // マーカーのみで分割
            var mkr = settings.boundaryMarker.replace(/^\s+/, "").replace(/\s+$/, "");
            var mkrRegex = new RegExp("(?:^|\\n)\\s*" + escapeRegex(mkr) + "\\s*(?:\\n|$)", "g");
            var mParts = text.split(mkrRegex);
            for (var m = 0; m < mParts.length; m++) {
                var blkM = cleanText(mParts[m]);
                if (blkM.length > 0 && blkM !== mkr) rawBlocks.push(blkM);
            }
        } else {
            // 空行数のみで分割 (デフォルト)
            var splitRegex = (linesCount <= 1)
                ? /\n\s*\n+/
                : new RegExp("\\n(?:\\s*\\n){" + linesCount + ",}");

            var sParts = text.split(splitRegex);
            for (var s = 0; s < sParts.length; s++) {
                var blkS = cleanText(sParts[s]);
                if (blkS.length > 0) rawBlocks.push(blkS);
            }
        }

        return rawBlocks;
    }

    /**
     * 生テキストに [P: ...] / [A: ...] タグを自動補完する
     */
    function autoTag(rawText, settings) {
        if (!rawText) return "";

        var text = cleanText(rawText);
        var blocks = splitBlocks(text, settings);
        var resultBlocks = [];

        var pSize = settings.pointSize || 14;
        var pUnit = settings.pointSizeUnit || "pt";
        var aSize = settings.areaSize || 10;
        var aUnit = settings.areaSizeUnit || "pt";
        var aWidth = settings.areaWidth || 300;
        var aWidthUnit = settings.areaWidthUnit || "pt";

        var mode = settings.detectMode || "auto"; // "auto" | "all_point" | "all_area"
        var useCharThreshold = (settings.useCharThreshold !== false);
        var threshold = (typeof settings.autoTagThreshold === "number") ? settings.autoTagThreshold : 30;

        for (var i = 0; i < blocks.length; i++) {
            var block = blocks[i].replace(/^\s+/, "").replace(/\s+$/, "");
            if (block.length === 0) continue;

            // 既に先頭にタグが存在するかチェック
            var tagMatch = block.match(/^\[(P|Point|A|Area)(?:\s*:[^\]]+)?\]/i);
            if (tagMatch) {
                resultBlocks.push(block);
                continue;
            }

            var isArea = false;
            if (mode === "all_point") {
                isArea = false;
            } else if (mode === "all_area") {
                isArea = true;
            } else {
                // "auto" 判定: 文字数閾値
                if (useCharThreshold && block.length >= threshold) {
                    isArea = true;
                }
            }

            var tagStr = isArea
                ? "[A: " + aSize + pUnit + ", " + aWidth + aWidthUnit + "]"
                : "[P: " + pSize + pUnit + "]";

            resultBlocks.push(tagStr + "\n" + block);
        }

        return resultBlocks.join("\n\n");
    }

    /**
     * タグ付きテキストを解析してオブジェクトリストを生成
     * 返却値: Array of { type: "point"|"area", size: number, width: number, height: number, text: string }
     */
    function parseTaggedText(text, settings) {
        if (!text) return [];

        var cleaned = cleanText(text);
        var rawBlocks = splitBlocks(cleaned, settings);
        var blocks = [];
        for (var b = 0; b < rawBlocks.length; b++) {
            // タグ行の開始を境界として確実にブロック分割
            var subBlocks = rawBlocks[b].split(/\n(?=\[(?:P|Point|A|Area)(?:\s*:[^\]]+)?\])/i);
            for (var sb = 0; sb < subBlocks.length; sb++) {
                var cleanSub = subBlocks[sb].replace(/^\s+/, "").replace(/\s+$/, "");
                if (cleanSub.length > 0) {
                    blocks.push(cleanSub);
                }
            }
        }
        var items = [];

        var defaultPSize = PlaceTextConfig.toPt(settings.pointSize || 14, settings.pointSizeUnit || "pt");
        var defaultASize = PlaceTextConfig.toPt(settings.areaSize || 10, settings.areaSizeUnit || "pt");
        var defaultAWidth = PlaceTextConfig.toPt(settings.areaWidth || 300, settings.areaWidthUnit || "pt");
        var defaultAHeight = PlaceTextConfig.toPt(settings.areaHeight || 0, settings.areaHeightUnit || "pt");

        var currentType = (settings.detectMode === "all_area") ? "area" : "point";
        var currentSize = (currentType === "point") ? defaultPSize : defaultASize;
        var currentWidth = defaultAWidth;
        var currentHeight = defaultAHeight;

        for (var i = 0; i < blocks.length; i++) {
            var block = blocks[i].replace(/^\s+/, "").replace(/\s+$/, "");
            if (block.length === 0) continue;

            // タグの検出（キャプチャグループ1: 種別, 2: パラメータ, 3: 本文）
            var tagMatch = block.match(/^\[(P|Point|A|Area)(?:\s*:\s*([^\]]+))?\]\s*\n?([\s\S]*)$/i);
            var bodyText = block;

            if (tagMatch) {
                var typeCode = tagMatch[1].toUpperCase();
                currentType = (typeCode === "P" || typeCode === "POINT") ? "point" : "area";

                var paramsStr = tagMatch[2];
                bodyText = tagMatch[3] || "";

                if (paramsStr) {
                    var params = paramsStr.split(",");
                    if (params.length >= 1 && params[0].replace(/\s+/g, "").length > 0) {
                        currentSize = parseUnit(params[0], currentSize);
                    }
                    if (params.length >= 2) {
                        var sizePart = params[1].toLowerCase().replace(/\s+/g, "");
                        if (sizePart.indexOf("x") !== -1) {
                            var wh = sizePart.split("x");
                            currentWidth = parseUnit(wh[0], currentWidth);
                            currentHeight = parseUnit(wh[1], currentHeight);
                        } else {
                            currentWidth = parseUnit(sizePart, currentWidth);
                        }
                    }
                }
            } else {
                // タグなしの場合のモード判定
                if (settings.detectMode === "all_point") {
                    currentType = "point";
                    currentSize = defaultPSize;
                } else if (settings.detectMode === "all_area") {
                    currentType = "area";
                    currentSize = defaultASize;
                }
            }

            bodyText = cleanText(bodyText);
            if (bodyText.length > 0) {
                items.push({
                    type: currentType,
                    size: currentSize,
                    width: currentWidth,
                    height: currentHeight,
                    text: bodyText
                });
            }
        }

        return items;
    }

    return {
        cleanText: cleanText,
        validateBoundaryMarker: validateBoundaryMarker,
        parseUnit: parseUnit,
        splitBlocks: splitBlocks,
        autoTag: autoTag,
        parseTaggedText: parseTaggedText
    };
})();


// =========================================================
// MODULE: core\layout.jsx
// =========================================================
/**
 * PlaceText - core/layout.jsx
 * レイアウトエンジン（ターゲットレイヤー安全取得、スマートスタック垂直整列）
 */

var PlaceTextLayout = (function () {

    /**
     * 編集可能（表示状態かつロック解除）なターゲットレイヤーを取得
     */
    function getTargetLayer(doc) {
        // 1. activeLayer が編集可能か確認
        if (doc.activeLayer && doc.activeLayer.visible && !doc.activeLayer.locked) {
            return doc.activeLayer;
        }

        // 2. 他に表示・ロック解除されているレイヤーを探す
        for (var i = 0; i < doc.layers.length; i++) {
            var l = doc.layers[i];
            if (l.visible && !l.locked) {
                doc.activeLayer = l;
                return l;
            }
        }

        // 3. なければ新規レイヤーを作成
        try {
            var newLayer = doc.layers.add();
            newLayer.name = "PlaceText";
            doc.activeLayer = newLayer;
            return newLayer;
        } catch (e) {
            throw new Error(PlaceTextErrors.formatMessage(PlaceTextErrors.CODES.TARGET_LAYER_INVALID, e.message));
        }
    }

    function getBasePosition(doc, settings) {
        var baseX = 0;
        var baseY = 0;
        var isVertical = (settings.textOrientation === "vertical");

        // 選択オブジェクト基準の判定
        if (settings.baseMode === "selection" && app.selection && app.selection.length > 0) {
            var minX = Infinity;
            var minY = Infinity;
            var maxX = -Infinity;
            var maxY = -Infinity;
            var validBoundsFound = false;

            for (var i = 0; i < app.selection.length; i++) {
                var sel = app.selection[i];
                if (sel && sel.geometricBounds) {
                    var b = sel.geometricBounds; // [left, top, right, bottom]
                    if (b[0] < minX) minX = b[0];
                    if (b[1] > maxY) maxY = b[1];
                    if (b[2] > maxX) maxX = b[2];
                    if (b[3] < minY) minY = b[3];
                    validBoundsFound = true;
                }
            }

            if (validBoundsFound) {
                var sp = PlaceTextConfig.toPt(settings.spacing || 20, settings.spacingUnit || "pt");
                if (isVertical) {
                    baseX = minX - sp; // 縦書き時は選択オブジェクトの左隣から開始
                    baseY = maxY;
                } else {
                    baseX = minX;
                    baseY = minY - sp; // 横書き時は選択オブジェクトの直下から開始
                }
                return { x: baseX, y: baseY };
            }
        }

        // アートボード基準（選択がない場合もここへフォールバック）
        var abIndex = doc.artboards.getActiveArtboardIndex();
        var ab = doc.artboards[abIndex];
        var r = ab.artboardRect; // [left, top, right, bottom]
        var marginX = PlaceTextConfig.toPt(settings.artboardMarginX || 30, "pt");
        var marginY = PlaceTextConfig.toPt(settings.artboardMarginY || 30, "pt");

        if (isVertical) {
            // 縦書き時はアートボードの右上から開始
            var defaultWidth = PlaceTextConfig.toPt(settings.areaWidth || 100, settings.areaWidthUnit || "pt");
            baseX = r[2] - marginX - defaultWidth;
            baseY = r[1] - marginY;
        } else {
            // 横書き時はアートボードの左上から開始
            baseX = r[0] + marginX;
            baseY = r[1] - marginY;
        }

        return { x: baseX, y: baseY };
    }

    /**
     * フォントの安全適用
     */
    function applyFontSafe(frame, fontName) {
        if (!fontName || fontName === "デフォルト" || fontName === "未指定") return;
        try {
            var f = app.textFonts.getByName(fontName);
            frame.textRange.characterAttributes.textFont = f;
        } catch (e) {
            // 見つからない場合はデフォルトフォントを維持
        }
    }

    /**
     * テキストフレーム群をスマートスタック（横書き: 垂直スタック / 縦書き: 水平スタック）で配置
     */
    function createStackLayout(doc, items, settings, isPreview) {
        if (!doc || !items || items.length === 0) return [];

        var targetLayer = getTargetLayer(doc);
        var base = getBasePosition(doc, settings);
        var currentX = base.x;
        var currentY = base.y;
        var spacing = PlaceTextConfig.toPt(settings.spacing || 20, settings.spacingUnit || "pt");
        var isVertical = (settings.textOrientation === "vertical");

        var createdObjects = [];
        var tagPrefix = isPreview ? "PlaceText_Preview_" : "PlaceText_";

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var frame = null;

            if (item.type === "area") {
                // エリア内文字
                var width = item.width || PlaceTextConfig.toPt(settings.areaWidth || 300, settings.areaWidthUnit || "pt");
                var fontSize = item.size || PlaceTextConfig.toPt(settings.areaSize || 10, settings.areaSizeUnit || "pt");

                // 文字量と幅から行数を推計して高さを十分に確保（オーバーフロー防止）
                var charsPerLine = Math.max(Math.floor(width / fontSize), 1);
                var rawLines = item.text.split("\n");
                var estLines = 0;
                for (var k = 0; k < rawLines.length; k++) {
                    estLines += Math.max(Math.ceil(rawLines[k].length / charsPerLine), 1);
                }
                var approxHeight = Math.max(estLines * fontSize * 1.8 + 20, 50);
                var height = (item.height && item.height > 0) ? item.height : approxHeight;

                // ターゲットレイヤー上に矩形パスを作成し、エリアテキストに変換
                var rect = targetLayer.pathItems.rectangle(currentY, currentX, width, height);
                frame = targetLayer.textFrames.areaText(rect);

                if (isVertical) {
                    try {
                        frame.orientation = TextOrientation.VERTICAL;
                    } catch (e) {}
                }

                frame.contents = item.text;

                // フォント適用 (エリア文字)
                var aFont = item.font || settings.areaFont;
                applyFontSafe(frame, aFont);

            } else {
                // ポイント文字
                if (isVertical) {
                    try {
                        frame = targetLayer.textFrames.pointText([currentX, currentY], TextOrientation.VERTICAL);
                    } catch (e) {
                        frame = targetLayer.textFrames.add();
                        frame.position = [currentX, currentY];
                        try { frame.orientation = TextOrientation.VERTICAL; } catch (_) {}
                    }
                } else {
                    frame = targetLayer.textFrames.add();
                    frame.position = [currentX, currentY];
                }

                frame.contents = item.text;

                // フォント適用 (ポイント文字)
                var pFont = item.font || settings.pointFont;
                applyFontSafe(frame, pFont);
            }

            frame.name = tagPrefix + i;

            // 文字サイズ適用
            try {
                if (item.size && item.size > 0) {
                    frame.textRange.characterAttributes.size = item.size;
                }
            } catch (e) {}

            // 段落属性の初期化（意図しないインデントやマージンの抑制）
            try {
                var p = frame.textRange.paragraphAttributes;
                p.justification = Justification.LEFT;
                p.firstLineIndent = 0;
                p.leftIndent = 0;
                p.rightIndent = 0;
                p.spaceBefore = 0;
                p.spaceAfter = 0;
            } catch (e) {}

            createdObjects.push(frame);

            // バウンディングボックスから次の配置座標を更新
            try {
                var b = frame.geometricBounds; // [left, top, right, bottom]
                if (isVertical) {
                    // 縦書き時は左方向（右から左）へ水平スタック
                    var leftX = b[0];
                    currentX = leftX - spacing;
                } else {
                    // 横書き時は下方向（上から下）へ垂直スタック
                    var bottomY = b[3];
                    currentY = bottomY - spacing;
                }
            } catch (e) {
                if (isVertical) {
                    currentX -= (100 + spacing);
                } else {
                    currentY -= ((item.size || 12) * 2 + spacing);
                }
            }
        }

        return createdObjects;
    }

    return {
        getTargetLayer: getTargetLayer,
        getBasePosition: getBasePosition,
        createStackLayout: createStackLayout
    };
})();


// =========================================================
// MODULE: io\fileLoader.jsx
// =========================================================
/**
 * PlaceText - io/fileLoader.jsx
 * ファイル読込モジュール（TXT, MD, CSV等）
 */

var PlaceTextIO = (function () {

    function chooseAndLoadFile() {
        var isWindows = ($.os.indexOf("Windows") !== -1);
        var filter = isWindows
            ? "テキストファイル (*.txt;*.md;*.markdown;*.csv):*.txt;*.md;*.markdown;*.csv,すべてのファイル (*.*):*.*"
            : function (f) {
                if (f instanceof Folder) return true;
                var ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
                return (ext === ".txt" || ext === ".md" || ext === ".markdown" || ext === ".csv");
            };

        var file = File.openDialog("配置するテキストファイルを選択してください", filter);
        if (!file) return null;
        return loadFile(file);
    }

    function readFileWithEncoding(file, encoding) {
        try {
            file.encoding = encoding;
            file.open("r");
            var content = file.read();
            file.close();
            return content;
        } catch (e) {
            try { file.close(); } catch (_) {}
            return null;
        }
    }

    function loadFile(fileOrPath) {
        var file = (typeof fileOrPath === "string") ? new File(fileOrPath) : fileOrPath;
        if (!file || !file.exists) return null;

        var content = readFileWithEncoding(file, "UTF-8");

        // UTF-8で空、または失敗した場合、Shift-JIS/CP932でリトライ
        if (content === null || content.length === 0) {
            var sjisContent = readFileWithEncoding(file, "CP932");
            if (sjisContent && sjisContent.length > 0) {
                content = sjisContent;
            }
        }

        if (content === null) {
            content = "";
        }

        // BOM (\uFEFF) の自動除去
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.substring(1);
        }

        // 改行コードの正規化 (\r\n, \r -> \n)
        content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

        return {
            path: file.fsName,
            name: file.name,
            content: content
        };
    }

    return {
        chooseAndLoadFile: chooseAndLoadFile,
        loadFile: loadFile
    };
})();


// =========================================================
// MODULE: ui\mainWindow.jsx
// =========================================================
/**
 * PlaceText - ui/mainWindow.jsx
 * メインGUIモジュール（左右2ペイン、マウスオーバーhelpTip、マーカーバリデーション、排他制御）
 */

var PlaceTextUI = (function () {

    var previewObjects = [];

    function clearPreview() {
        for (var i = previewObjects.length - 1; i >= 0; i--) {
            try {
                previewObjects[i].remove();
            } catch (e) {}
        }
        previewObjects = [];
        try { app.redraw(); } catch (e) {}
    }

    function showDialog() {
        if (app.documents.length === 0) {
            PlaceTextErrors.showAlert(PlaceTextErrors.CODES.NO_DOCUMENT);
            return;
        }

        var doc = app.activeDocument;
        var settings = PlaceTextConfig.loadSettings();

        // -------------------------
        // メインウィンドウ (2ペイン)
        // -------------------------
        var win = new Window("dialog", PlaceTextConfig.APP_NAME + " v" + PlaceTextConfig.APP_VERSION);
        win.orientation = "column";
        win.alignChildren = "fill";
        win.spacing = 10;
        win.margins = 15;

        // 左右2ペインのコンテナグループ
        var paneGroup = win.add("group");
        paneGroup.orientation = "row";
        paneGroup.alignChildren = ["fill", "fill"];
        paneGroup.spacing = 15;

        // =========================================================
        // 【左ペイン】 テキスト入力
        // =========================================================
        var leftPane = paneGroup.add("panel", undefined, "テキスト入力");
        leftPane.orientation = "column";
        leftPane.alignChildren = "fill";
        leftPane.spacing = 8;
        leftPane.margins = 12;
        leftPane.preferredSize = [430, 560];

        /**
         * 丸にiのインフォメーションアイコン (ⓘ) を生成
         * @param {Group|Panel} parent 配置先コンテナ
         * @param {string} tipText ツールチップ・解説テキスト
         * @param {string} [titleText] アラート表示時のタイトル
         * @returns {StaticText} 生成されたアイコン
         */
        function createInfoIcon(parent, tipText, titleText) {
            var icon = parent.add("statictext", undefined, "\u24D8"); // ⓘ
            icon.helpTip = tipText;
            icon.graphics.foregroundColor = icon.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.15, 0.45, 0.85, 1], 1);
            try {
                icon.addEventListener("mousedown", function () {
                    alert("【" + (titleText || "機能説明") + "】\n\n" + tipText, "PlaceText - ヘルプ");
                });
            } catch (e) {}
            return icon;
        }

        // 使い方・記法説明
        var helpGroup = leftPane.add("group");
        helpGroup.orientation = "column";
        helpGroup.alignChildren = "left";
        helpGroup.spacing = 2;

        var helpRow1 = helpGroup.add("group");
        helpRow1.orientation = "row";
        helpRow1.alignChildren = ["left", "center"];
        helpRow1.spacing = 6;
        var help1 = helpRow1.add("statictext", undefined, "記法: [P: 14pt] = ポイント文字, [A: 10pt, 300pt] = エリア内文字");
        help1.graphics.foregroundColor = help1.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.35, 0.35, 0.35, 1], 1);
        createInfoIcon(helpRow1, "【インラインタグ構文】\n[P: <サイズ>] でポイント文字（1行・見出し用）を指定。\n[A: <サイズ>, <幅>] または [A: <サイズ>, <幅>x<高さ>] でエリア内文字（複数行・段落用）を指定。\nタグのないブロックは直前の設定を継承、またはデフォルト値が適用されます。", "インラインタグ構文");

        var helpRow2 = helpGroup.add("group");
        helpRow2.orientation = "row";
        helpRow2.alignChildren = ["left", "center"];
        helpRow2.spacing = 6;
        var help2 = helpRow2.add("statictext", undefined, "自動タグ付け: 空行やマーカーをオブジェクトの区切りとして認識");
        help2.graphics.foregroundColor = help2.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.35, 0.35, 0.35, 1], 1);

        // ファイル操作・テキスト操作ボタン
        var fileBtnGroup = leftPane.add("group");
        fileBtnGroup.orientation = "row";
        fileBtnGroup.alignChildren = ["left", "center"];
        fileBtnGroup.spacing = 8;

        var loadFileBtn = fileBtnGroup.add("button", undefined, "ファイル読込 (TXT/MD)");
        var clearTextBtn = fileBtnGroup.add("button", undefined, "テキスト消去");

        // モデル文字列（プレースホルダー）定義
        var PLACEHOLDER_TEXT = "[P: 14pt]\r\nポイント文字。\r\nフォントサイズをタグに入力して指定します。\r\n\r\n[A: 10pt, 300pt]\r\nエリア内文字。\r\nフォントサイズと枠の横幅、高さを指定します。\r\n高さを指定しない場合、自動で作成します。\r\n改行を含めることもできますが、テキストオブジェクト内の\r\n空の行数が閾値を超えないようにする必要があります。";

        var isPlaceholder = true;

        // テキスト入力ウィンドウ
        var inputBox = leftPane.add("edittext", undefined, PLACEHOLDER_TEXT, {
            multiline: true,
            scrolling: true
        });
        inputBox.preferredSize = [410, 380];

        function showPlaceholder() {
            inputBox.text = PLACEHOLDER_TEXT;
            isPlaceholder = true;
            statusText.text = "ステータス : テキストが入力されていません (モデル表示中)";
        }

        function hidePlaceholder() {
            if (isPlaceholder || inputBox.text === PLACEHOLDER_TEXT) {
                inputBox.text = "";
                isPlaceholder = false;
            }
        }

        function getRealInputText() {
            if (isPlaceholder || inputBox.text === PLACEHOLDER_TEXT) {
                return "";
            }
            return inputBox.text;
        }

        inputBox.onActivate = function () {
            if (isPlaceholder || inputBox.text === PLACEHOLDER_TEXT) {
                hidePlaceholder();
            }
        };

        inputBox.onDeactivate = function () {
            if (inputBox.text.replace(/\s+/g, "").length === 0) {
                showPlaceholder();
            }
        };

        // 自動タグ付けボタン (入力欄の直下)
        var autoTagRow = leftPane.add("group");
        autoTagRow.orientation = "row";
        autoTagRow.alignChildren = ["fill", "center"];
        autoTagRow.spacing = 6;
        var autoTagBtn = autoTagRow.add("button", undefined, "⚡ 自動タグ付け (Auto-Tag)");
        autoTagBtn.alignment = ["fill", "center"];
        createInfoIcon(autoTagRow, "入力テキストを空行や境界マーカーで分割し、右ペインの設定（文字数閾値など）に基づいて [P: ...] や [A: ...] のタグを各ブロックの先頭に自動挿入します。", "自動タグ付け");

        // =========================================================
        // 【右ペイン】 標準設定
        // =========================================================
        var rightPane = paneGroup.add("panel", undefined, "標準設定");
        rightPane.orientation = "column";
        rightPane.alignChildren = "fill";
        rightPane.spacing = 8;
        rightPane.margins = 12;
        rightPane.preferredSize = [430, 560];

        var UNIT_OPTIONS = ["pt", "mm", "inch"];

        function createSettingRow(parentPanel, labelText, defaultVal, defaultUnit, inputChars, infoTip, infoTitle) {
            var row = parentPanel.add("group");
            row.orientation = "row";
            row.alignChildren = ["left", "center"];
            row.spacing = 6;

            var lbl = row.add("statictext", undefined, labelText);
            lbl.preferredSize = [130, 20];

            var edit = row.add("edittext", undefined, String(defaultVal));
            edit.characters = inputChars || 6;
            edit.justify = "right";

            var unitDrop = null;
            if (defaultUnit !== undefined) {
                unitDrop = row.add("dropdownlist", undefined, UNIT_OPTIONS);
                unitDrop.preferredSize = [60, 22];
                var selectIdx = 0;
                for (var u = 0; u < UNIT_OPTIONS.length; u++) {
                    if (UNIT_OPTIONS[u] === defaultUnit) selectIdx = u;
                }
                unitDrop.selection = selectIdx;
            }

            if (infoTip) {
                createInfoIcon(row, infoTip, infoTitle || labelText.replace(/[:：\s]/g, ""));
            }

            return { row: row, label: lbl, edit: edit, unitDrop: unitDrop };
        }

        var FONT_PRESETS = [
            "デフォルト (未指定)",
            "KozGoPr6N-Regular",
            "KozGoPr6N-Medium",
            "KozGoPr6N-Bold",
            "KozMinPr6N-Regular",
            "ArialMT",
            "Helvetica",
            "MS-Gothic",
            "MS-PGothic",
            "YuGothic-Medium",
            "直接入力"
        ];

        function createFontSettingRow(parentPanel, labelText, defaultFont, infoTip, infoTitle) {
            var row = parentPanel.add("group");
            row.orientation = "row";
            row.alignChildren = ["left", "center"];
            row.spacing = 6;

            var lbl = row.add("statictext", undefined, labelText);
            lbl.preferredSize = [130, 20];

            var dropFont = row.add("dropdownlist", undefined, FONT_PRESETS);
            dropFont.preferredSize = [130, 22];

            var initialFont = defaultFont || "";
            var initIdx = 0;
            var found = false;
            if (initialFont !== "" && initialFont !== "デフォルト" && initialFont !== "未指定") {
                for (var i = 1; i < FONT_PRESETS.length - 1; i++) {
                    if (FONT_PRESETS[i] === initialFont) {
                        initIdx = i;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    initIdx = FONT_PRESETS.length - 1; // 直接入力
                }
            }
            dropFont.selection = initIdx;

            var customFontInput = row.add("edittext", undefined, initialFont);
            customFontInput.characters = 9;
            customFontInput.enabled = (dropFont.selection.text === "直接入力");

            dropFont.onChange = function () {
                if (dropFont.selection.text === "直接入力") {
                    customFontInput.enabled = true;
                    customFontInput.active = true;
                } else if (dropFont.selection.index === 0) {
                    customFontInput.enabled = false;
                    customFontInput.text = "";
                } else {
                    customFontInput.enabled = false;
                    customFontInput.text = dropFont.selection.text;
                }
            };

            if (infoTip) {
                createInfoIcon(row, infoTip, infoTitle || labelText.replace(/[:：\s]/g, ""));
            }

            return {
                getFont: function () {
                    if (dropFont.selection.index === 0) return "";
                    if (dropFont.selection.text === "直接入力") return customFontInput.text.replace(/^\s+|\s+$/g, "");
                    return dropFont.selection.text;
                }
            };
        }

        // --- セクション1: 自動判定の閾値設定 ---
        var detectBox = rightPane.add("panel", undefined, "自動判定の閾値設定");
        detectBox.orientation = "column";
        detectBox.alignChildren = "left";
        detectBox.spacing = 5;

        // すべてポイント / すべてエリアの排他チェックボックス
        var modeRow = detectBox.add("group");
        modeRow.orientation = "row";
        modeRow.alignChildren = ["left", "center"];
        modeRow.spacing = 15;
        var chkAllPoint = modeRow.add("checkbox", undefined, "すべてポイント文字");
        var chkAllArea = modeRow.add("checkbox", undefined, "すべてエリア内文字");
        createInfoIcon(modeRow, "文字数や行数にかかわらず、すべてのテキストブロックを強制的に「ポイント文字」または「エリア内文字」として自動タグ付けします。", "一括判定モード");

        if (settings.detectMode === "all_point") {
            chkAllPoint.value = true;
        } else if (settings.detectMode === "all_area") {
            chkAllArea.value = true;
        }

        chkAllPoint.onClick = function () {
            if (chkAllPoint.value) chkAllArea.value = false;
            updateSubParamsState();
        };
        chkAllArea.onClick = function () {
            if (chkAllArea.value) chkAllPoint.value = false;
            updateSubParamsState();
        };

        // 境界マーカー設定行
        var markerRow = detectBox.add("group");
        markerRow.orientation = "row";
        markerRow.alignChildren = ["left", "center"];
        markerRow.spacing = 6;

        var chkMarker = markerRow.add("checkbox", undefined, "特定の境界マーカー");
        chkMarker.value = (settings.useBoundaryMarker === true);

        var MARKER_PRESETS = ["---", "===", "###", "***", "///", "自由入力"];
        var dropMarker = markerRow.add("dropdownlist", undefined, MARKER_PRESETS);
        dropMarker.preferredSize = [70, 22];

        // 既存設定マーカーの選択状態を復元
        var initPresetIdx = 0; // デフォルト "---"
        var currentSavedMarker = settings.boundaryMarker || "---";
        var isPresetFound = false;
        for (var p = 0; p < MARKER_PRESETS.length - 1; p++) {
            if (MARKER_PRESETS[p] === currentSavedMarker) {
                initPresetIdx = p;
                isPresetFound = true;
                break;
            }
        }
        if (!isPresetFound) {
            initPresetIdx = MARKER_PRESETS.length - 1; // "自由入力"
        }
        dropMarker.selection = initPresetIdx;

        var customMarkerInput = markerRow.add("edittext", undefined, currentSavedMarker);
        customMarkerInput.characters = 6;
        customMarkerInput.enabled = (dropMarker.selection.text === "自由入力");
        createInfoIcon(markerRow, "【特定の境界マーカー】\n空行だけでなく、指定した目印文字列（例: --- や ===）が存在する行をオブジェクトの境界として認識し、分割します。自由入力では半角英数記号5文字以内を指定できます。\n\n※注意: 本文中にマーカーと同一の文字列が存在する場合、意図しない位置でオブジェクトが分割される可能性があります。本文中で使われない固有の記号列を指定するか、空行との「AND検索」を併用してください。", "境界マーカー");

        // マーカーのバリデーションステータス表示
        var markerStatusRow = detectBox.add("group");
        markerStatusRow.margins = [20, 0, 0, 0];
        var markerStatusLbl = markerStatusRow.add("statictext", undefined, "✓ 使用可能");
        markerStatusLbl.graphics.foregroundColor = markerStatusLbl.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.2, 0.5, 0.2, 1], 1);

        function validateMarkerUI() {
            if (!chkMarker.enabled || !chkMarker.value) {
                markerStatusLbl.text = "";
                markerStatusRow.visible = false;
                return;
            }
            markerStatusRow.visible = true;
            var mkr = (dropMarker.selection.text === "自由入力") ? customMarkerInput.text : dropMarker.selection.text;
            var res = PlaceTextParser.validateBoundaryMarker(mkr);
            if (res.valid) {
                markerStatusLbl.text = "✓ " + res.message;
                markerStatusLbl.graphics.foregroundColor = markerStatusLbl.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.2, 0.5, 0.2, 1], 1);
            } else {
                markerStatusLbl.text = "⚠ " + res.message;
                markerStatusLbl.graphics.foregroundColor = markerStatusLbl.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.8, 0.2, 0.2, 1], 1);
            }
        }

        dropMarker.onChange = function () {
            if (dropMarker.selection.text === "自由入力") {
                customMarkerInput.enabled = true;
                customMarkerInput.active = true;
            } else {
                customMarkerInput.enabled = false;
                customMarkerInput.text = dropMarker.selection.text;
            }
            validateMarkerUI();
        };

        customMarkerInput.onChanging = function () {
            validateMarkerUI();
        };

        // 条件の検索方法 (OR検索 / AND検索)
        var condRow = detectBox.add("group");
        condRow.orientation = "row";
        condRow.alignChildren = ["left", "center"];
        condRow.spacing = 10;
        condRow.margins = [10, 2, 0, 2];

        var lblCond = condRow.add("statictext", undefined, "条件の検索方法:");
        var rbOr = condRow.add("radiobutton", undefined, "OR検索");
        var rbAnd = condRow.add("radiobutton", undefined, "AND検索");

        // マウスオーバー（helpTip）の説明設定
        var tipOr = "【OR検索】指定数以上の空行、または境界マーカーのいずれかが出現した位置でオブジェクトを分割します。";
        var tipAnd = "【AND検索】境界マーカーの前後に指定数以上の空行がある場合のみオブジェクトを分割します。";
        lblCond.helpTip = "境界分割における空行とマーカーの組み合わせ方法を指定します。";
        rbOr.helpTip = tipOr;
        rbAnd.helpTip = tipAnd;
        createInfoIcon(condRow, "【OR検索】指定数以上の空行、または境界マーカーのいずれかが出現した位置で分割します。\n\n【AND検索】境界マーカーの前後に指定数以上の空行がある場合のみオブジェクトを分割します。", "条件の検索方法");

        if (settings.boundaryMode === "and") {
            rbAnd.value = true;
        } else {
            rbOr.value = true;
        }

        // 文字数閾値 行
        var rowCharThreshold = detectBox.add("group");
        rowCharThreshold.orientation = "row";
        rowCharThreshold.alignChildren = ["left", "center"];
        rowCharThreshold.spacing = 6;
        rowCharThreshold.margins = [10, 0, 0, 0];

        var chkCharThreshold = rowCharThreshold.add("checkbox", undefined, "文字数 :");
        chkCharThreshold.value = (settings.useCharThreshold !== false);

        var thresholdInput = rowCharThreshold.add("edittext", undefined, String(settings.autoTagThreshold || 30));
        thresholdInput.characters = 5;
        thresholdInput.justify = "right";

        var lblCharUnit = rowCharThreshold.add("statictext", undefined, "文字 (これ以上をエリア内文字と判定)");
        createInfoIcon(rowCharThreshold, "1ブロックの文字数がこの閾値以上の場合に、自動タグ付けで「エリア内文字 [A]」と判定します。閾値未満は「ポイント文字 [P]」になります。", "文字数閾値");

        // 空行の数 行
        var rowBlankLines = detectBox.add("group");
        rowBlankLines.orientation = "row";
        rowBlankLines.alignChildren = ["left", "center"];
        rowBlankLines.spacing = 6;
        rowBlankLines.margins = [10, 0, 0, 0];

        var chkBlankLines = rowBlankLines.add("checkbox", undefined, "空行の数 :");
        chkBlankLines.value = (settings.useBlankLines !== false);

        var blankLinesInput = rowBlankLines.add("edittext", undefined, String(settings.blankLinesCount || 1));
        blankLinesInput.characters = 5;
        blankLinesInput.justify = "right";

        var lblLinesUnit = rowBlankLines.add("statictext", undefined, "行 (この行数をオブジェクトの境界と判定)");
        createInfoIcon(rowBlankLines, "オブジェクトの区切りとみなす連続した空行の数です。1の場合は空行1行（改行2回）でテキストが別々のオブジェクトに分割されます。", "空行の数");

        // サブ項目のグレーアウト連動処理
        function updateSubParamsState() {
            var isAllForced = chkAllPoint.value || chkAllArea.value;
            var subEnabled = !isAllForced;

            chkMarker.enabled = subEnabled;
            dropMarker.enabled = subEnabled && chkMarker.value;
            customMarkerInput.enabled = subEnabled && chkMarker.value && (dropMarker.selection.text === "自由入力");
            rbOr.enabled = subEnabled;
            rbAnd.enabled = subEnabled;
            chkCharThreshold.enabled = subEnabled;
            thresholdInput.enabled = subEnabled && chkCharThreshold.value;
            chkBlankLines.enabled = subEnabled;
            blankLinesInput.enabled = subEnabled && chkBlankLines.value;

            validateMarkerUI();
        }

        chkMarker.onClick = updateSubParamsState;
        chkCharThreshold.onClick = updateSubParamsState;
        chkBlankLines.onClick = updateSubParamsState;
        updateSubParamsState();

        // --- セクション2: ポイント文字 ---
        var pointBox = rightPane.add("panel", undefined, "ポイント文字");
        pointBox.orientation = "column";
        pointBox.alignChildren = "left";
        pointBox.spacing = 4;
        var rowPSize = createSettingRow(pointBox, "文字サイズ:", settings.pointSize, settings.pointSizeUnit || "pt", 5,
            "ポイント文字（見出し・キャッチコピー用）のデフォルト文字サイズです。タグにサイズが明記されていない場合に適用されます。", "ポイント文字サイズ");
        var rowPFont = createFontSettingRow(pointBox, "フォント:", settings.pointFont,
            "ポイント文字に適用するフォントのPostScript名（例: KozGoPr6N-Medium、ArialMT）を指定します。未指定の場合はIllustratorの既定フォントが適用されます。", "ポイントフォント");

        // --- セクション3: エリア内文字 ---
        var areaBox = rightPane.add("panel", undefined, "エリア内文字");
        areaBox.orientation = "column";
        areaBox.alignChildren = "left";
        areaBox.spacing = 4;
        var rowASize = createSettingRow(areaBox, "文字サイズ:", settings.areaSize, settings.areaSizeUnit || "pt", 5,
            "エリア内文字（本文・段落用）のデフォルト文字サイズです。", "エリア文字サイズ");
        var rowAWidth = createSettingRow(areaBox, "エリア幅:", settings.areaWidth, settings.areaWidthUnit || "pt", 6,
            "エリア内文字のフレーム幅（横幅）です。テキストはこの幅で自動折り返しされます。", "エリア幅");
        var rowAHeight = createSettingRow(areaBox, "エリア高さ (0=自動):", settings.areaHeight || 0, settings.areaHeightUnit || "pt", 6,
            "エリア内文字のフレーム高さです。0を指定すると、テキスト量や行数に応じて高さを自動計算します。", "エリア高さ");
        var rowAFont = createFontSettingRow(areaBox, "フォント:", settings.areaFont,
            "エリア内文字に適用するフォントのPostScript名（例: KozGoPr6N-Regular、ArialMT）を指定します。未指定の場合はIllustratorの既定フォントが適用されます。", "エリアフォント");

        // --- セクション4: 配置設定 ---
        var layoutBox = rightPane.add("panel", undefined, "配置設定");
        layoutBox.orientation = "column";
        layoutBox.alignChildren = "left";
        layoutBox.spacing = 4;

        var rowOrientation = layoutBox.add("group");
        rowOrientation.orientation = "row";
        rowOrientation.alignChildren = ["left", "center"];
        rowOrientation.spacing = 6;
        var lblOrient = rowOrientation.add("statictext", undefined, "書字方向:");
        lblOrient.preferredSize = [130, 20];
        var rbHorizontal = rowOrientation.add("radiobutton", undefined, "横書き (水平)");
        var rbVertical = rowOrientation.add("radiobutton", undefined, "縦書き (垂直)");
        if (settings.textOrientation === "vertical") {
            rbVertical.value = true;
        } else {
            rbHorizontal.value = true;
        }
        createInfoIcon(rowOrientation, "【書字方向】\n生成するテキストオブジェクトの組版方向を指定します。\n・横書き (水平): 水平方向に文字が並び、オブジェクトは上から下へ垂直にスタック配置されます。\n・縦書き (垂直): 垂直方向に文字が並び、オブジェクトは右から左（日本語組版標準）へ水平にスタック配置されます。", "書字方向");

        var rowSpacing = createSettingRow(layoutBox, "オブジェクト間隔:", settings.spacing, settings.spacingUnit || "pt", 5,
            "生成したテキストオブジェクト同士を垂直スタック配置する際の間隔（マージン）です。重なりを防ぎ、等間隔に配置します。", "オブジェクト間隔");

        var rowBase = layoutBox.add("group");
        rowBase.orientation = "row";
        rowBase.alignChildren = ["left", "center"];
        rowBase.spacing = 6;
        var lblBase = rowBase.add("statictext", undefined, "配置基準:");
        lblBase.preferredSize = [130, 20];
        var rbSelection = rowBase.add("radiobutton", undefined, "選択直下");
        var rbArtboard = rowBase.add("radiobutton", undefined, "アートボード基準");
        if (settings.baseMode === "artboard") {
            rbArtboard.value = true;
        } else {
            rbSelection.value = true;
        }
        createInfoIcon(rowBase, "【選択直下】現在アートボード上で選択されているオブジェクトの真下から配置を開始します。\n\n【アートボード基準】アクティブアートボードの左上余白から配置を開始します。", "配置基準");

        // =========================================================
        // 【最下部】 ステータス ＆ アクションボタンバー
        // =========================================================
        var bottomBar = win.add("group");
        bottomBar.orientation = "row";
        bottomBar.alignChildren = ["fill", "center"];
        bottomBar.spacing = 10;

        var statusText = bottomBar.add("statictext", undefined, "ステータス : テキストが入力されていません (モデル表示中)");
        statusText.preferredSize = [460, 22];
        statusText.graphics.foregroundColor = statusText.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.2, 0.45, 0.2, 1], 1);

        var actionBtns = bottomBar.add("group");
        actionBtns.orientation = "row";
        actionBtns.spacing = 8;
        actionBtns.alignment = "right";

        var previewBtn = actionBtns.add("button", undefined, "プレビュー");
        var applyBtn = actionBtns.add("button", undefined, "テキスト作成");
        var cancelBtn = actionBtns.add("button", undefined, "キャンセル");
        createInfoIcon(actionBtns, "【プレビュー】一時的なテキストオブジェクトをアートボード上に生成して配置レイアウトを確認します。ダイアログ終了時に自動消去されます。\n\n【テキスト作成】テキストオブジェクトを確定配置してダイアログを閉じます。", "アクション");

        // -------------------------
        // イベントハンドラ & 同期処理
        // -------------------------

        function syncSettingsFromUI() {
            if (chkAllPoint.value) {
                settings.detectMode = "all_point";
            } else if (chkAllArea.value) {
                settings.detectMode = "all_area";
            } else {
                settings.detectMode = "auto";
            }

            // 境界設定 (解釈A)
            settings.boundaryMode = rbAnd.value ? "and" : "or";
            settings.useBoundaryMarker = chkMarker.value;
            settings.boundaryMarker = (dropMarker.selection.text === "自由入力") ? customMarkerInput.text : dropMarker.selection.text;
            settings.useBlankLines = chkBlankLines.value;
            settings.blankLinesCount = parseInt(blankLinesInput.text, 10) || 1;

            // 文字数閾値
            settings.useCharThreshold = chkCharThreshold.value;
            settings.autoTagThreshold = parseInt(thresholdInput.text, 10) || 30;

            // 書字方向
            settings.textOrientation = rbVertical.value ? "vertical" : "horizontal";

            // ポイント文字
            settings.pointSize = parseFloat(rowPSize.edit.text) || 14;
            settings.pointSizeUnit = rowPSize.unitDrop.selection.text;
            settings.pointFont = rowPFont.getFont();

            // エリア内文字
            settings.areaSize = parseFloat(rowASize.edit.text) || 10;
            settings.areaSizeUnit = rowASize.unitDrop.selection.text;
            settings.areaWidth = parseFloat(rowAWidth.edit.text) || 300;
            settings.areaWidthUnit = rowAWidth.unitDrop.selection.text;
            settings.areaHeight = parseFloat(rowAHeight.edit.text) || 0;
            settings.areaHeightUnit = rowAHeight.unitDrop.selection.text;
            settings.areaFont = rowAFont.getFont();

            // 配置
            settings.spacing = parseFloat(rowSpacing.edit.text) || 20;
            settings.spacingUnit = rowSpacing.unitDrop.selection.text;
            settings.baseMode = rbArtboard.value ? "artboard" : "selection";

            PlaceTextConfig.saveSettings(settings);
            return settings;
        }

        inputBox.onChanging = function () {
            if (isPlaceholder) {
                isPlaceholder = false;
            }
            var real = getRealInputText();
            if (real.replace(/\s+/g, "").length === 0) {
                statusText.text = "ステータス : テキストが入力されていません";
            } else {
                statusText.text = "ステータス : 入力中 (" + real.length + " 文字)";
            }
        };

        loadFileBtn.onClick = function () {
            try {
                var res = PlaceTextIO.chooseAndLoadFile();
                if (res && res.content) {
                    isPlaceholder = false;
                    // Windows ScriptUI multiline edittext は \r\n (CRLF) が必須
                    var normalizedText = res.content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n/g, "\r\n");
                    inputBox.text = normalizedText;
                    inputBox.active = true;
                    statusText.text = "ステータス : ファイル読込完了 (" + res.name + ")";
                }
            } catch (err) {
                PlaceTextErrors.showAlert(PlaceTextErrors.CODES.FILE_IO_FAILED, err.message, err.line);
            }
        };

        clearTextBtn.onClick = function () {
            showPlaceholder();
            clearPreview();
            statusText.text = "ステータス : テキストを消去しました";
        };

        autoTagBtn.onClick = function () {
            try {
                var currentSettings = syncSettingsFromUI();
                var realText = getRealInputText();
                if (realText.replace(/\s+/g, "").length === 0) {
                    PlaceTextErrors.showAlert(PlaceTextErrors.CODES.EMPTY_TEXT);
                    return;
                }
                var tagged = PlaceTextParser.autoTag(realText, currentSettings);
                isPlaceholder = false;
                inputBox.text = tagged;
                statusText.text = "ステータス : 自動タグ付け完了";
            } catch (err) {
                PlaceTextErrors.showAlert(PlaceTextErrors.CODES.PARSE_FAILED, err.message, err.line);
            }
        };

        previewBtn.onClick = function () {
            try {
                clearPreview();
                var currentSettings = syncSettingsFromUI();
                var realText = getRealInputText();
                if (realText.replace(/\s+/g, "").length === 0) {
                    PlaceTextErrors.showAlert(PlaceTextErrors.CODES.EMPTY_TEXT);
                    return;
                }
                var items = PlaceTextParser.parseTaggedText(realText, currentSettings);
                if (items.length === 0) {
                    PlaceTextErrors.showAlert(PlaceTextErrors.CODES.EMPTY_TEXT);
                    return;
                }
                previewObjects = PlaceTextLayout.createStackLayout(doc, items, currentSettings, true);
                app.redraw();
                statusText.text = "ステータス : プレビュー中 (" + previewObjects.length + " 件のオブジェクト)";
            } catch (err) {
                PlaceTextErrors.showAlert(PlaceTextErrors.CODES.PREVIEW_FAILED, err.message, err.line);
            }
        };

        applyBtn.onClick = function () {
            try {
                clearPreview();
                var currentSettings = syncSettingsFromUI();
                var realText = getRealInputText();
                if (realText.replace(/\s+/g, "").length === 0) {
                    PlaceTextErrors.showAlert(PlaceTextErrors.CODES.EMPTY_TEXT);
                    return;
                }
                var items = PlaceTextParser.parseTaggedText(realText, currentSettings);
                if (items.length === 0) {
                    PlaceTextErrors.showAlert(PlaceTextErrors.CODES.EMPTY_TEXT);
                    return;
                }
                var created = PlaceTextLayout.createStackLayout(doc, items, currentSettings, false);
                win.close(1);
            } catch (err) {
                PlaceTextErrors.showAlert(PlaceTextErrors.CODES.LAYOUT_FAILED, err.message, err.line);
            }
        };

        cancelBtn.onClick = function () {
            clearPreview();
            win.close(0);
        };

        win.onClose = function () {
            clearPreview();
        };

        win.show();
    }

    return {
        showDialog: showDialog
    };
})();


    // Launch UI
    PlaceTextUI.showDialog();

})();
