#target illustrator

/**
 * PlaceText - Adobe Illustrator Text Batch Placement Script
 * @version 0.3.0
 * @build 2026-10-17 12:23:05
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
    var APP_VERSION = "0.3.0";

    var DEFAULT_SETTINGS = {
        // 判定モード: "auto" | "all_point" | "all_area"
        detectMode: "auto",

        // 境界判定設定 (解釈A)
        boundaryMode: "or",       // "or" | "and"
        useBoundaryMarker: false, // 特定の境界マーカーを使用するか
        boundaryMarker: "---",    // 境界マーカー文字列 (半角英数記号5文字以内)
        useBlankLines: true,      // 空行による境界判定を使用するか
        blankLinesCount: 1,       // 境界とする空行の数
        useMarkdownHeaders: true, // Markdown見出し (#) でブロックを自動分割するか

        // 種別判定設定 (エリア内文字 / ポイント文字)
        useTypeMarkers: true,     // ブロック先頭の簡易マーカー [P]/[A], (P)/(A) を認識するか
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
    MESSAGES[CODES.PARSE_FAILED] = "テキストのブロック分割・解析処理に失敗しました。";
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
 * ブロック分割・メタデータ付与モジュール（空行・マーカー分割、OR/AND境界条件、バリデーション、自動判定、メタデータ管理）
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
                var andLinesPattern = (linesCount <= 1) ? "\\n[ \\t]*\\n+" : "\\n(?:[ \\t]*\\n){" + linesCount + ",}";
                var andRegex = new RegExp(andLinesPattern + "[ \\t]*" + escapedMarker + "[ \\t]*" + andLinesPattern, "g");
                var andParts = text.split(andRegex);
                for (var a = 0; a < andParts.length; a++) {
                    var blkAnd = cleanText(andParts[a]);
                    if (blkAnd.length > 0 && blkAnd !== marker) rawBlocks.push(blkAnd);
                }
            } else {
                // OR検索: 指定数以上の空行、またはマーカー行（前後の空行を吸収）のいずれかで分割
                var orMarkerPattern = "(?:^|\\n)(?:[ \\t]*\\n)*[ \\t]*" + escapedMarker + "[ \\t]*(?:\\n[ \\t]*)*(?:\\n|$)";
                var orLinesPattern = (linesCount <= 1) ? "\\n[ \\t]*\\n+" : "\\n(?:[ \\t]*\\n){" + linesCount + ",}";
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
            var mkrRegex = new RegExp("(?:^|\\n)[ \\t]*" + escapeRegex(mkr) + "[ \\t]*(?:\\n|$)", "g");
            var mParts = text.split(mkrRegex);
            for (var m = 0; m < mParts.length; m++) {
                var blkM = cleanText(mParts[m]);
                if (blkM.length > 0 && blkM !== mkr) rawBlocks.push(blkM);
            }
        } else {
            // 空行数のみで分割 (デフォルト)
            var splitRegex = (linesCount <= 1)
                ? /\n[ \t]*\n+/
                : new RegExp("\\n(?:[ \\t]*\\n){" + linesCount + ",}");

            var sParts = text.split(splitRegex);
            for (var s = 0; s < sParts.length; s++) {
                var blkS = cleanText(sParts[s]);
                if (blkS.length > 0) rawBlocks.push(blkS);
            }
        }

        // Markdown見出し (#) による自動ブロック切り分け
        if (settings && settings.useMarkdownHeaders !== false && rawBlocks.length > 0) {
            var mdSplitBlocks = [];
            for (var b = 0; b < rawBlocks.length; b++) {
                var blk = rawBlocks[b];
                var lines = blk.split(/\r?\n/);
                var currentChunk = [];
                for (var j = 0; j < lines.length; j++) {
                    var line = lines[j];
                    if (/^#{1,6}\s+/.test(line)) {
                        if (currentChunk.length > 0) {
                            var chunkStr = cleanText(currentChunk.join("\n"));
                            if (chunkStr.length > 0) mdSplitBlocks.push(chunkStr);
                            currentChunk = [];
                        }
                        var headerLine = cleanText(line);
                        if (headerLine.length > 0) mdSplitBlocks.push(headerLine);
                    } else {
                        currentChunk.push(line);
                    }
                }
                if (currentChunk.length > 0) {
                    var finalChunkStr = cleanText(currentChunk.join("\n"));
                    if (finalChunkStr.length > 0) mdSplitBlocks.push(finalChunkStr);
                }
            }
            rawBlocks = mdSplitBlocks;
        }

        return rawBlocks;
    }

    /**
     * ブロック先頭の簡易タイプマーカー ([P], [A], (P), (A)) または Markdown 見出し記号 (#) を抽出・除去する
     */
    function stripTypeMarker(text, settings) {
        if (!text) return "";
        var res = text;
        var useTypeMarkers = (!settings || settings.useTypeMarkers !== false);
        if (useTypeMarkers) {
            res = res.replace(/^(\[[PApa]\]|\([PApa]\))[ \t]*/, "");
        }
        var useMD = (!settings || settings.useMarkdownHeaders !== false);
        if (useMD) {
            res = res.replace(/^#{1,6}[ \t]+/, "");
        }
        return res;
    }

    /**
     * ブロック本文と設定から種別 ("point" | "area") を推論する
     */
    function inferBlockType(blockText, settings) {
        var mode = (settings && settings.detectMode) ? settings.detectMode : "auto";
        if (mode === "all_point") return "point";
        if (mode === "all_area") return "area";

        var clean = cleanText(blockText || "");

        // 1. 簡易タイプマーカー [P], [A], (P), (A) の明示判定
        var useTypeMarkers = (!settings || settings.useTypeMarkers !== false);
        if (useTypeMarkers && clean.length > 0) {
            var m = clean.match(/^(\[[PApa]\]|\([PApa]\))/);
            if (m) {
                var ch = m[1].charAt(1).toUpperCase();
                if (ch === "P") return "point";
                if (ch === "A") return "area";
            }
        }

        // 2. Markdown見出し (#) の判定 (見出しはポイント文字)
        var useMD = (!settings || settings.useMarkdownHeaders !== false);
        if (useMD && clean.length > 0) {
            if (/^#{1,6}\s+/.test(clean)) {
                return "point";
            }
        }

        // 3. 文字数閾値による自動判定
        var useCharThreshold = (!settings || settings.useCharThreshold !== false);
        var threshold = (settings && typeof settings.autoTagThreshold === "number") ? settings.autoTagThreshold : 30;
        var stripped = cleanText(stripTypeMarker(clean, settings));
        if (useCharThreshold && stripped.length >= threshold) {
            return "area";
        }
        return "point";
    }

    /**
     * ブロックアイテムの表示単位値 (sizeVal, widthVal, heightVal) から pt 値 (size, width, height) を再計算する
     */
    function syncBlockItemPt(item) {
        if (!item) return item;
        item.size = PlaceTextConfig.toPt(item.sizeVal, item.sizeUnit || "pt");
        item.width = PlaceTextConfig.toPt(item.widthVal, item.widthUnit || "pt");
        item.height = PlaceTextConfig.toPt(item.heightVal, item.heightUnit || "pt");
        return item;
    }

    /**
     * 単一のブロックメタデータオブジェクトを生成する
     */
    function createBlockItem(blockText, type, settings) {
        var s = settings || PlaceTextConfig.DEFAULT_SETTINGS;
        var resolvedType = (type === "area" || type === "point") ? type : inferBlockType(blockText, s);
        var isArea = (resolvedType === "area");
        var strippedText = cleanText(stripTypeMarker(blockText || "", s));

        var sizeVal = isArea ? (s.areaSize || 10) : (s.pointSize || 14);
        var sizeUnit = isArea ? (s.areaSizeUnit || "pt") : (s.pointSizeUnit || "pt");
        var widthVal = s.areaWidth || 300;
        var widthUnit = s.areaWidthUnit || "pt";
        var heightVal = s.areaHeight || 0;
        var heightUnit = s.areaHeightUnit || "pt";
        var font = isArea ? (s.areaFont || "") : (s.pointFont || "");

        var item = {
            type: resolvedType,
            sizeVal: sizeVal,
            sizeUnit: sizeUnit,
            widthVal: widthVal,
            widthUnit: widthUnit,
            heightVal: heightVal,
            heightUnit: heightUnit,
            size: 0,
            width: 0,
            height: 0,
            font: font,
            text: strippedText
        };

        return syncBlockItemPt(item);
    }

    /**
     * 既存ブロックの種別を切り替え、対応する標準設定のサイズ・幅・フォントを適用する
     */
    function applyTypeDefaults(item, newType, settings) {
        if (!item) return item;
        var s = settings || PlaceTextConfig.DEFAULT_SETTINGS;
        var isArea = (newType === "area");
        item.type = isArea ? "area" : "point";
        item.sizeVal = isArea ? (s.areaSize || 10) : (s.pointSize || 14);
        item.sizeUnit = isArea ? (s.areaSizeUnit || "pt") : (s.pointSizeUnit || "pt");
        item.widthVal = s.areaWidth || 300;
        item.widthUnit = s.areaWidthUnit || "pt";
        item.heightVal = s.areaHeight || 0;
        item.heightUnit = s.areaHeightUnit || "pt";
        item.font = isArea ? (s.areaFont || "") : (s.pointFont || "");
        return syncBlockItemPt(item);
    }

    /**
     * 生テキストを分割し、各ブロックにメタデータを付与した配列を生成する（文中記法に一切依存しない）
     * 返却値: Array of BlockItem
     */
    function createBlockItems(rawText, settings) {
        if (!rawText) return [];
        var s = settings || PlaceTextConfig.DEFAULT_SETTINGS;
        var cleaned = cleanText(rawText);
        if (cleaned.length === 0) return [];

        var blocks = splitBlocks(cleaned, s);
        var items = [];

        for (var i = 0; i < blocks.length; i++) {
            var block = cleanText(blocks[i]);
            if (block.length === 0) continue;
            var type = inferBlockType(block, s);
            items.push(createBlockItem(block, type, s));
        }

        return items;
    }

    /**
     * ListBox 表示用のサマリー文字列群を生成する
     */
    function formatBlockSummary(item) {
        if (!item) {
            return { typeLabel: "", sizeLabel: "", previewText: "" };
        }
        var isArea = (item.type === "area");
        var typeLabel = isArea ? "エリア" : "ポイント";
        var sUnit = item.sizeUnit || "pt";
        var wUnit = item.widthUnit || "pt";

        var sizeLabel = "";
        if (isArea) {
            if (item.heightVal && item.heightVal > 0) {
                sizeLabel = item.sizeVal + sUnit + " / " + item.widthVal + "x" + item.heightVal + wUnit;
            } else {
                sizeLabel = item.sizeVal + sUnit + " / 幅" + item.widthVal + wUnit;
            }
        } else {
            sizeLabel = item.sizeVal + sUnit;
        }

        var oneLine = (item.text || "").replace(/\r\n/g, " / ").replace(/\r/g, " / ").replace(/\n/g, " / ");
        var previewText = (oneLine.length > 26) ? (oneLine.substring(0, 26) + "...") : oneLine;

        return {
            typeLabel: typeLabel,
            sizeLabel: sizeLabel,
            previewText: previewText
        };
    }

    /**
     * テキスト入力欄用のマルチステップ Undo / Redo 履歴管理オブジェクトを生成する
     * @param {number} [maxSteps=50] 最大履歴保持数
     */
    function createTextHistory(maxSteps) {
        var limit = (typeof maxSteps === "number" && maxSteps > 1) ? maxSteps : 50;
        var stack = [""];
        var index = 0;

        function push(text) {
            var val = (text === undefined || text === null) ? "" : String(text);
            if (stack[index] === val) return;
            if (index < stack.length - 1) {
                stack = stack.slice(0, index + 1);
            }
            stack.push(val);
            if (stack.length > limit) {
                stack.shift();
            } else {
                index = stack.length - 1;
            }
        }

        function canUndo() {
            return index > 0;
        }

        function canRedo() {
            return index < stack.length - 1;
        }

        function undo() {
            if (!canUndo()) return stack[index];
            index--;
            return stack[index];
        }

        function redo() {
            if (!canRedo()) return stack[index];
            index++;
            return stack[index];
        }

        function current() {
            return stack[index];
        }

        function reset(initialText) {
            var val = (initialText === undefined || initialText === null) ? "" : String(initialText);
            stack = [val];
            index = 0;
        }

        return {
            push: push,
            canUndo: canUndo,
            canRedo: canRedo,
            undo: undo,
            redo: redo,
            current: current,
            reset: reset
        };
    }

    return {
        cleanText: cleanText,
        validateBoundaryMarker: validateBoundaryMarker,
        parseUnit: parseUnit,
        splitBlocks: splitBlocks,
        inferBlockType: inferBlockType,
        syncBlockItemPt: syncBlockItemPt,
        createBlockItem: createBlockItem,
        applyTypeDefaults: applyTypeDefaults,
        createBlockItems: createBlockItems,
        formatBlockSummary: formatBlockSummary,
        createTextHistory: createTextHistory,
        stripTypeMarker: stripTypeMarker
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
     * フォント検索キャッシュ（同一実行セッション内での高速化）
     */
    var fontCache = {};
    var cachedAvailableFonts = null;

    /**
     * 利用可能な全Illustratorフォント一覧を取得（初回のみ走査しキャッシュ）
     * 各要素: { name: PostScript名, family: ファミリー名, style: スタイル名, displayName: 表示名, searchText: 検索用小文字文字列 }
     *
     * @returns {Array} フォント情報オブジェクトの配列
     */
    function getAvailableFonts() {
        if (cachedAvailableFonts !== null) return cachedAvailableFonts;
        cachedAvailableFonts = [];

        var fonts = null;
        try {
            if (typeof app !== "undefined" && app.textFonts) {
                fonts = app.textFonts;
            }
        } catch (e) {
            return [];
        }
        if (!fonts || fonts.length === 0) return [];

        for (var i = 0; i < fonts.length; i++) {
            try {
                var f = fonts[i];
                if (!f) continue;
                var psName = f.name || "";
                var family = f.family || "";
                var style = f.style || "";
                var displayName = family ? (style ? family + " " + style : family) : psName;
                cachedAvailableFonts.push({
                    name: psName,
                    family: family,
                    style: style,
                    displayName: displayName,
                    searchText: (psName + " " + family + " " + style + " " + displayName).toLowerCase()
                });
            } catch (e) {}
        }

        // 表示名順に昇順ソート
        cachedAvailableFonts.sort(function (a, b) {
            var na = a.displayName.toLowerCase();
            var nb = b.displayName.toLowerCase();
            if (na < nb) return -1;
            if (na > nb) return 1;
            return 0;
        });

        return cachedAvailableFonts;
    }

    /**
     * フォント名からTextFontオブジェクトを安全に検索・取得する
     * 1. PostScript名の完全一致検索 (app.textFonts.getByName)
     * 2. PostScript名の大文字小文字無視一致
     * 3. ファミリー名 + スタイルの一致 (例: "KozGoPr6N Regular")
     * 4. ファミリー名の完全一致 (例: "墨東レラ", "FOT-墨東レラ Std")
     * 5. ファミリー名またはPostScript名の部分一致 (例: "墨東レラ" で "FOT-墨東レラ Std" を検出)
     *
     * @param {string} fontName - 検索するフォント名
     * @returns {TextFont|null} 見つかったTextFontオブジェクト、またはnull
     */
    function findFont(fontName) {
        if (!fontName || fontName === "デフォルト" || fontName === "未指定") return null;
        if (fontCache[fontName] !== undefined) return fontCache[fontName];

        var fonts = null;
        try {
            if (typeof app !== "undefined" && app.textFonts) {
                fonts = app.textFonts;
            }
        } catch (e) {
            return null;
        }
        if (!fonts || fonts.length === 0) return null;

        // 1. PostScript名による高速完全一致
        try {
            if (typeof fonts.getByName === "function") {
                var directFont = fonts.getByName(fontName);
                if (directFont) {
                    fontCache[fontName] = directFont;
                    return directFont;
                }
            }
        } catch (e) {}

        var targetLower = fontName.toLowerCase();
        var candidateFamilyMatch = null;
        var candidatePartialMatch = null;

        // 2. インストール済みフォント一覧から名称照合
        for (var i = 0; i < fonts.length; i++) {
            var f = fonts[i];
            if (!f) continue;

            var psName = f.name ? f.name.toLowerCase() : "";
            var family = f.family ? f.family.toLowerCase() : "";
            var style = f.style ? f.style.toLowerCase() : "";
            var fullName = (f.family && f.style) ? (f.family + " " + f.style).toLowerCase() : "";

            // 2-1. PostScript名の大文字小文字無視一致
            if (psName === targetLower) {
                fontCache[fontName] = f;
                return f;
            }

            // 2-2. 「Family Style」の一致
            if (fullName === targetLower) {
                fontCache[fontName] = f;
                return f;
            }

            // 2-3. ファミリー名の完全一致
            if (family === targetLower && !candidateFamilyMatch) {
                candidateFamilyMatch = f;
            }

            // 2-4. ファミリー名またはPostScript名の部分一致（「墨東レラ」入力で「FOT-墨東レラ Std」等を検出）
            if (!candidatePartialMatch) {
                if (family.indexOf(targetLower) !== -1 || psName.indexOf(targetLower) !== -1) {
                    candidatePartialMatch = f;
                }
            }
        }

        var matched = candidateFamilyMatch || candidatePartialMatch || null;
        fontCache[fontName] = matched;
        return matched;
    }

    /**
     * フォントの安全適用
     */
    function applyFontSafe(frame, fontName) {
        if (!frame || !frame.textRange || !fontName) return;
        if (fontName === "デフォルト" || fontName === "未指定") return;
        try {
            var f = findFont(fontName);
            if (f) {
                frame.textRange.characterAttributes.textFont = f;
            }
        } catch (e) {
            // 見つからない場合はIllustrator既定フォントを維持
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
        createStackLayout: createStackLayout,
        findFont: findFont,
        getAvailableFonts: getAvailableFonts
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
 * メインGUIモジュール（左右2ペイン、ブロック一覧ListBox、メタデータインスペクタ、マウスオーバーhelpTip、マーカーバリデーション）
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

        // ブロックメタデータ管理ステート
        var blockItems = [];
        var selectedBlockIndex = -1;
        var isUpdatingInspector = false;
        var isInputDirty = false;

        // テキスト履歴管理ステート (Undo / Redo & Tab挿入)
        var inputHistory = PlaceTextParser.createTextHistory(50);
        var blockTextHistory = PlaceTextParser.createTextHistory(50);
        var activeEditor = "input"; // "input" | "inspector"
        var isApplyingHistory = false;
        var lastTabInsertTime = 0;
        var lastFocusedEditorBeforeTab = "";

        // ウィンドウ表示モードステート (通常展開 / プレビュー時コンパクト折りたたみ)
        var isCollapsed = false;
        var fullWindowSize = [920, 680];
        var lastActiveTab = null;

        // -------------------------
        // メインウィンドウ (2ペイン)
        // -------------------------
        var win = new Window("dialog", PlaceTextConfig.APP_NAME + " v" + PlaceTextConfig.APP_VERSION, undefined, {
            resizeable: true
        });
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 10;
        win.margins = 15;

        // -------------------------
        // メインコンテンツラッパーグループ (折りたたみ制御用)
        // -------------------------
        var mainContentGroup = win.add("group");
        mainContentGroup.orientation = "column";
        mainContentGroup.alignChildren = ["fill", "fill"];
        mainContentGroup.alignment = ["fill", "fill"];

        // -------------------------
        // タブ切り替えコンテナ (tabbedpanel)
        // -------------------------
        var tabbedPanel = mainContentGroup.add("tabbedpanel");
        tabbedPanel.alignChildren = ["fill", "fill"];
        tabbedPanel.alignment = ["fill", "fill"];
        tabbedPanel.spacing = 10;
        tabbedPanel.margins = 0;

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

        // =========================================================
        // 【タブ1】 テキスト編集
        // =========================================================
        var tabEditor = tabbedPanel.add("tab", undefined, "テキスト編集");
        tabEditor.orientation = "row";
        tabEditor.alignChildren = ["fill", "fill"];
        tabEditor.spacing = 15;
        tabEditor.margins = 10;

        // --- 左ペイン: 原稿テキスト入力・読込 ---
        var leftPane = tabEditor.add("panel", undefined, "原稿テキスト入力・読込");
        leftPane.orientation = "column";
        leftPane.alignChildren = "fill";
        leftPane.spacing = 6;
        leftPane.margins = 10;
        leftPane.preferredSize = [440, 550];

        // ソース表示行
        var sourceRow = leftPane.add("group");
        sourceRow.orientation = "row";
        sourceRow.alignChildren = ["left", "center"];
        sourceRow.spacing = 6;
        var lblCurrentSource = sourceRow.add("statictext", undefined, "ソース : 直接入力");
        lblCurrentSource.preferredSize = [390, 18];
        lblCurrentSource.graphics.foregroundColor = lblCurrentSource.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.35, 0.35, 0.35, 1], 1);

        // ファイル操作・テキスト操作・編集支援ボタン群
        var fileBtnGroup = leftPane.add("group");
        fileBtnGroup.orientation = "row";
        fileBtnGroup.alignChildren = ["left", "center"];
        fileBtnGroup.spacing = 4;

        var loadFileBtn = fileBtnGroup.add("button", undefined, "ファイル読込");
        loadFileBtn.preferredSize = [78, 24];
        loadFileBtn.helpTip = "外部テキストファイル (TXT / MD / CSV) を読み込み、ブロック一覧へ自動展開します";

        var loadSelectionBtn = fileBtnGroup.add("button", undefined, "選択から取得");
        loadSelectionBtn.preferredSize = [84, 24];
        loadSelectionBtn.helpTip = "Illustrator上で選択されている未アウトライン化テキストフレームの本文を取得します";

        var clearTextBtn = fileBtnGroup.add("button", undefined, "消去");
        clearTextBtn.preferredSize = [46, 24];
        clearTextBtn.helpTip = "入力テキストとブロック一覧を消去します（元に戻すで復元可能）";

        var btnInsertTab = fileBtnGroup.add("button", undefined, "Tab挿入");
        btnInsertTab.preferredSize = [60, 24];
        btnInsertTab.helpTip = "現在編集中のテキスト欄のカーソル位置にタブ文字 (\\t) を挿入します (ショートカット: Tab)";

        var btnUndo = fileBtnGroup.add("button", undefined, "元に戻す");
        btnUndo.preferredSize = [64, 24];
        btnUndo.helpTip = "直前のテキスト編集を元に戻します (ショートカット: Ctrl+Z)";
        btnUndo.enabled = false;

        var btnRedo = fileBtnGroup.add("button", undefined, "やり直し");
        btnRedo.preferredSize = [64, 24];
        btnRedo.helpTip = "元に戻したテキスト編集をやり直します (ショートカット: Ctrl+Y / Ctrl+Shift+Z)";
        btnRedo.enabled = false;

        createInfoIcon(fileBtnGroup, "【テキスト入力＆編集支援】\n・'ファイル読込': TXT/MD/CSVから原稿を読込\n・'選択から取得': キャンバス上の選択中テキストフレームから文字を取得\n・Tab / Ctrl+Z / Ctrl+Y: タブ挿入および最大50段階のUndo/Redoに対応\n※原稿入力欄と右ペインの選択ブロック本文欄の両方で利用できます。", "テキスト入力機能");

        // モデル文字列（プレースホルダー）定義
        var PLACEHOLDER_TEXT = "見出しテキスト（短い行や # 見出しはポイント文字と自動判定されます）\r\n\r\nここは本文の段落です。指定した文字数（初期値30文字）以上のブロックは自動的にエリア内文字として判定され、指定幅で折り返し配置されます。\r\n各ブロックの種別やサイズは、右側のブロック一覧から個別に変更できます。";

        var isPlaceholder = true;

        // 原稿テキスト入力ウィンドウ (高さいっぱいに拡張)
        var inputBox = leftPane.add("edittext", undefined, PLACEHOLDER_TEXT, {
            multiline: true,
            scrolling: true
        });
        inputBox.preferredSize = [420, 420];

        function showPlaceholder() {
            inputBox.text = PLACEHOLDER_TEXT;
            isPlaceholder = true;
            isInputDirty = false;
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
            activeEditor = "input";
            lastFocusedEditorBeforeTab = "input";
            if (isPlaceholder || inputBox.text === PLACEHOLDER_TEXT) {
                hidePlaceholder();
            }
            updateHistoryButtonsUI();
        };

        inputBox.onDeactivate = function () {
            try {
                var kb = ScriptUI.environment.keyboardState;
                if (!kb || kb.keyName !== "Tab") {
                    lastFocusedEditorBeforeTab = "";
                }
            } catch (e) {}
            if (inputBox.text.replace(/\s+/g, "").length === 0) {
                showPlaceholder();
            }
        };

        // ブロック分割・自動判定ボタン
        var splitRow = leftPane.add("group");
        splitRow.orientation = "row";
        splitRow.alignChildren = ["fill", "center"];
        splitRow.spacing = 6;
        var splitBtn = splitRow.add("button", undefined, "テキストをブロック分割・自動判定");
        splitBtn.alignment = ["fill", "center"];
        createInfoIcon(splitRow, "入力された原稿テキストを空行や境界マーカー、Markdown見出しで分割し、標準設定に基づいて各ブロックにメタデータ（ポイント/エリア、サイズ、幅）を自動付与して右のブロック一覧に展開します。", "ブロック分割・自動判定");

        // --- 右ペイン: ブロック一覧・メタデータ編集 ---
        var rightPaneEditor = tabEditor.add("panel", undefined, "ブロック一覧・メタデータ編集");
        rightPaneEditor.orientation = "column";
        rightPaneEditor.alignChildren = "fill";
        rightPaneEditor.spacing = 6;
        rightPaneEditor.margins = 10;
        rightPaneEditor.preferredSize = [450, 550];

        var listHeaderRow = rightPaneEditor.add("group");
        listHeaderRow.orientation = "row";
        listHeaderRow.alignChildren = ["left", "center"];
        listHeaderRow.spacing = 6;
        var lblListHeader = listHeaderRow.add("statictext", undefined, "ブロック一覧 (ダブルクリックで ポイント ⇔ エリア 切替)");
        lblListHeader.graphics.foregroundColor = lblListHeader.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.35, 0.35, 0.35, 1], 1);
        createInfoIcon(listHeaderRow, "【ブロック一覧の操作】\n・ダブルクリック: その場で「ポイント文字 ⇔ エリア内文字」を即座に切替\n・行選択: 下のインスペクタで種別・サイズ・幅・高さ・本文を個別に編集\n・'上と結合': 選択中のブロックを1つ上のブロックに改行付きで結合", "ブロック一覧操作");

        var blockList = rightPaneEditor.add("listbox", undefined, [], {
            numberOfColumns: 4,
            showHeaders: true,
            columnTitles: ["No.", "種別", "サイズ / 幅", "本文プレビュー"],
            columnWidths: [32, 60, 115, 205]
        });
        blockList.preferredSize = [430, 275];

        // ブロック操作ツールバー
        var listActionRow = rightPaneEditor.add("group");
        listActionRow.orientation = "row";
        listActionRow.alignChildren = ["left", "center"];
        listActionRow.spacing = 6;

        var btnAddBlock = listActionRow.add("button", undefined, "+ 追加");
        btnAddBlock.preferredSize = [65, 22];
        var btnRemoveBlock = listActionRow.add("button", undefined, "- 削除");
        btnRemoveBlock.preferredSize = [65, 22];
        var btnMergeUp = listActionRow.add("button", undefined, "上と結合");
        btnMergeUp.preferredSize = [80, 22];
        var btnMoveUp = listActionRow.add("button", undefined, "上へ");
        btnMoveUp.preferredSize = [55, 22];
        var btnMoveDown = listActionRow.add("button", undefined, "下へ");
        btnMoveDown.preferredSize = [55, 22];

        // 選択ブロックのメタデータ編集パネル (インスペクタ)
        var inspectorBox = rightPaneEditor.add("panel", undefined, "選択ブロックのメタデータ編集");
        inspectorBox.orientation = "column";
        inspectorBox.alignChildren = "fill";
        inspectorBox.spacing = 4;
        inspectorBox.margins = [10, 10, 10, 8];
        inspectorBox.preferredSize = [430, 180];

        var metaRow1 = inspectorBox.add("group");
        metaRow1.orientation = "row";
        metaRow1.alignChildren = ["left", "center"];
        metaRow1.spacing = 6;
        metaRow1.add("statictext", undefined, "種別:");
        var rbBlockPoint = metaRow1.add("radiobutton", undefined, "ポイント");
        var rbBlockArea = metaRow1.add("radiobutton", undefined, "エリア");
        rbBlockPoint.value = true;
        metaRow1.add("statictext", undefined, "   サイズ:");
        var editBlockSize = metaRow1.add("edittext", undefined, "");
        editBlockSize.characters = 5;
        editBlockSize.justify = "right";
        var lblBlockSizeUnit = metaRow1.add("statictext", undefined, "pt");
        lblBlockSizeUnit.preferredSize = [28, 18];

        var metaRow2 = inspectorBox.add("group");
        metaRow2.orientation = "row";
        metaRow2.alignChildren = ["left", "center"];
        metaRow2.spacing = 6;
        metaRow2.add("statictext", undefined, "エリア幅:");
        var editBlockWidth = metaRow2.add("edittext", undefined, "");
        editBlockWidth.characters = 5;
        editBlockWidth.justify = "right";
        var lblBlockWidthUnit = metaRow2.add("statictext", undefined, "pt");
        lblBlockWidthUnit.preferredSize = [28, 18];
        metaRow2.add("statictext", undefined, "高さ(0=自動):");
        var editBlockHeight = metaRow2.add("edittext", undefined, "");
        editBlockHeight.characters = 5;
        editBlockHeight.justify = "right";
        var lblBlockHeightUnit = metaRow2.add("statictext", undefined, "pt");
        lblBlockHeightUnit.preferredSize = [28, 18];

        var metaRow3 = inspectorBox.add("group");
        metaRow3.orientation = "row";
        metaRow3.alignChildren = ["left", "top"];
        metaRow3.spacing = 6;
        var lblBlockText = metaRow3.add("statictext", undefined, "本文:");
        lblBlockText.preferredSize = [35, 20];
        var editBlockText = metaRow3.add("edittext", undefined, "", {
            multiline: true,
            scrolling: true
        });
        editBlockText.preferredSize = [350, 56];
        editBlockText.onActivate = function () {
            activeEditor = "inspector";
            lastFocusedEditorBeforeTab = "inspector";
            updateHistoryButtonsUI();
        };
        editBlockText.onDeactivate = function () {
            try {
                var kb = ScriptUI.environment.keyboardState;
                if (!kb || kb.keyName !== "Tab") {
                    lastFocusedEditorBeforeTab = "";
                }
            } catch (e) {}
        };

        inspectorBox.enabled = false;

        // =========================================================
        // 【タブ2】 標準設定
        // =========================================================
        var tabSettings = tabbedPanel.add("tab", undefined, "標準設定");
        tabSettings.orientation = "row";
        tabSettings.alignChildren = ["fill", "fill"];
        tabSettings.spacing = 15;
        tabSettings.margins = 10;

        var leftSettingsCol = tabSettings.add("group");
        leftSettingsCol.orientation = "column";
        leftSettingsCol.alignChildren = "fill";
        leftSettingsCol.spacing = 10;
        leftSettingsCol.preferredSize = [440, 550];

        var rightSettingsCol = tabSettings.add("group");
        rightSettingsCol.orientation = "column";
        rightSettingsCol.alignChildren = "fill";
        rightSettingsCol.spacing = 10;
        rightSettingsCol.preferredSize = [450, 550];

        var UNIT_OPTIONS = ["pt", "mm", "inch"];

        function createSettingRow(parentPanel, labelText, defaultVal, defaultUnit, inputChars) {
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
            "直接入力 (自由入力)"
        ];

        /**
         * フォント検索・サジェストダイアログ
         * Illustratorにインストールされている全フォントからリアルタイムに絞り込み検索・選択
         */
        function showFontSearchDialog(initialQuery, onSelect) {
            var allFonts = PlaceTextLayout.getAvailableFonts();
            if (!allFonts || allFonts.length === 0) {
                alert("利用可能なIllustratorフォントが見つかりませんでした。\nドキュメントを開いた状態で再度お試しください。", "PlaceText - フォント検索");
                return;
            }

            var dlg = new Window("dialog", "フォント検索・サジェスト - PlaceText");
            dlg.orientation = "column";
            dlg.alignChildren = ["fill", "top"];
            dlg.spacing = 8;
            dlg.margins = [16, 16, 16, 14];

            var headerGroup = dlg.add("group");
            headerGroup.orientation = "column";
            headerGroup.alignChildren = ["fill", "center"];
            headerGroup.spacing = 4;

            var lblPrompt = headerGroup.add("statictext", undefined, "フォント名またはファミリー名を入力して検索（例: 墨東、ゴシック、Arial）:");
            var searchInput = headerGroup.add("edittext", undefined, initialQuery || "");
            searchInput.preferredSize = [480, 24];

            var statusLbl = headerGroup.add("statictext", undefined, "一致候補: 0 件");
            statusLbl.graphics.foregroundColor = statusLbl.graphics.newPen(dlg.graphics.PenType.SOLID_COLOR, [0.35, 0.35, 0.35, 1], 1);

            // 2列リストボックス: [フォント名 (Family + Style), PostScript名]
            var fontList = dlg.add("listbox", undefined, [], {
                numberOfColumns: 2,
                showHeaders: true,
                columnTitles: ["フォント名 (Family + Style)", "PostScript名"],
                columnWidths: [280, 180]
            });
            fontList.preferredSize = [480, 240];

            var currentMatches = [];

            function refreshList(keyword) {
                fontList.removeAll();
                currentMatches = [];
                var q = (keyword || "").replace(/^\s+|\s+$/g, "").toLowerCase();

                var maxResults = 80;
                for (var i = 0; i < allFonts.length; i++) {
                    var f = allFonts[i];
                    if (q === "" || f.searchText.indexOf(q) !== -1) {
                        currentMatches.push(f);
                        if (currentMatches.length >= maxResults) break;
                    }
                }

                for (var j = 0; j < currentMatches.length; j++) {
                    var itm = currentMatches[j];
                    var li = fontList.add("item", itm.displayName);
                    if (li.subItems && li.subItems.length > 0) {
                        li.subItems[0].text = itm.name;
                    }
                }

                if (q === "") {
                    statusLbl.text = "インストール済みフォント: " + allFonts.length + " 件 (先頭 " + currentMatches.length + " 件を表示中)";
                } else {
                    statusLbl.text = "「" + keyword + "」の一致候補: " + currentMatches.length + " 件 (最大 " + maxResults + " 件表示)";
                }

                if (fontList.items.length > 0) {
                    fontList.selection = 0;
                }
            }

            searchInput.onChanging = function () {
                refreshList(searchInput.text);
            };

            var btnRow = dlg.add("group");
            btnRow.orientation = "row";
            btnRow.alignChildren = ["right", "center"];
            btnRow.spacing = 8;

            var btnCancel = btnRow.add("button", undefined, "キャンセル", { name: "cancel" });
            btnCancel.preferredSize = [80, 26];

            var btnOk = btnRow.add("button", undefined, "このフォントを適用", { name: "ok" });
            btnOk.preferredSize = [140, 26];

            function applySelection() {
                if (fontList.selection && fontList.selection.index >= 0) {
                    var selIdx = fontList.selection.index;
                    if (selIdx < currentMatches.length) {
                        var selectedFont = currentMatches[selIdx];
                        if (typeof onSelect === "function") {
                            onSelect(selectedFont.name, selectedFont.displayName);
                        }
                        dlg.close(1);
                    }
                }
            }

            fontList.onDoubleClick = applySelection;

            btnOk.onClick = applySelection;
            btnCancel.onClick = function () {
                dlg.close(0);
            };

            refreshList(initialQuery || "");
            searchInput.active = true;

            dlg.center();
            dlg.show();
        }

        function createFontSettingRow(parentPanel, labelText, defaultFont) {
            var row = parentPanel.add("group");
            row.orientation = "row";
            row.alignChildren = ["left", "center"];
            row.spacing = 6;

            var lbl = row.add("statictext", undefined, labelText);
            lbl.preferredSize = [130, 20];

            var dropFont = row.add("dropdownlist", undefined, FONT_PRESETS);
            dropFont.preferredSize = [115, 22];

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
                    initIdx = FONT_PRESETS.length - 1; // 直接入力 (自由入力)
                }
            }
            try {
                dropFont.selection = initIdx;
            } catch (e) {}

            var customFontInput = row.add("edittext", undefined, initialFont);
            customFontInput.preferredSize = [105, 22];
            customFontInput.helpTip = "任意のフォント名（PostScript名または「墨東レラ」等の日本語ファミリー名）を入力できます";

            var isInitialCustom = (dropFont.selection && dropFont.selection.text.indexOf("入力") !== -1);
            customFontInput.enabled = isInitialCustom;

            var btnSearch = row.add("button", undefined, "検索...");
            btnSearch.preferredSize = [54, 22];
            btnSearch.helpTip = "Illustratorにインストールされているフォントを検索・サジェストから選択します";

            btnSearch.onClick = function () {
                try {
                    dropFont.selection = FONT_PRESETS.length - 1;
                    customFontInput.enabled = true;
                } catch (e) {}
                showFontSearchDialog(customFontInput.text, function (psName, displayName) {
                    customFontInput.text = psName;
                    if (typeof statusText !== "undefined" && statusText) {
                        statusText.text = "ステータス : フォント選択 (" + displayName + " [" + psName + "])";
                    }
                });
            };

            dropFont.onChange = function () {
                if (!dropFont.selection) return;
                var selText = dropFont.selection.text;
                if (selText.indexOf("入力") !== -1) {
                    customFontInput.enabled = true;
                    customFontInput.active = true;
                } else if (dropFont.selection.index === 0) {
                    customFontInput.enabled = false;
                    customFontInput.text = "";
                } else {
                    customFontInput.enabled = false;
                    customFontInput.text = selText;
                }
            };

            customFontInput.onChange = function () {
                if (customFontInput.text) {
                    customFontInput.text = customFontInput.text.replace(/^\s+|\s+$/g, "");
                }
            };

            return {
                getFont: function () {
                    if (!dropFont.selection) {
                        // ドロップダウンの選択が一時的にnullの場合のフォールバック
                        var raw = customFontInput.text ? customFontInput.text.replace(/^\s+|\s+$/g, "") : "";
                        return raw;
                    }
                    if (dropFont.selection.index === 0) return "";
                    var selText = dropFont.selection.text;
                    if (selText.indexOf("入力") !== -1) {
                        return customFontInput.text ? customFontInput.text.replace(/^\s+|\s+$/g, "") : "";
                    }
                    return selText;
                }
            };
        }

        // --- パネル1: ブロック自動分割ルール ---
        var splitRuleBox = leftSettingsCol.add("panel", undefined, "1. ブロック自動分割ルール");
        splitRuleBox.orientation = "column";
        splitRuleBox.alignChildren = "fill";
        splitRuleBox.spacing = 5;
        splitRuleBox.margins = [12, 14, 12, 10];

        var splitRuleHeader = splitRuleBox.add("group");
        splitRuleHeader.orientation = "row";
        splitRuleHeader.alignChildren = ["fill", "center"];
        var lblSplitRuleTitle = splitRuleHeader.add("statictext", undefined, "原稿のオブジェクト境界判定");
        lblSplitRuleTitle.graphics.foregroundColor = lblSplitRuleTitle.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.35, 0.35, 0.35, 1], 1);
        createInfoIcon(splitRuleHeader, "【ブロック自動分割ルール】\n原稿テキストをどこで別々のオブジェクトに切り分けるかを設定します。\n・特定の境界マーカー: 指定文字列（--- など）の行で分割\n・検索条件 (OR/AND): 空行とマーカーの組み合わせ条件\n・空行の数: 指定行数の連続空行で分割\n・Markdown見出し: # で始まる行を自動的に独立した見出しブロックとして切り分けます。\n※種別判定（ポイント/エリア）とは独立して常に有効に動作します。", "ブロック自動分割ルール");

        // 境界マーカー設定行
        var markerRow = splitRuleBox.add("group");
        markerRow.orientation = "row";
        markerRow.alignChildren = ["left", "center"];
        markerRow.spacing = 6;

        var chkMarker = markerRow.add("checkbox", undefined, "特定の境界マーカー:");
        chkMarker.value = (settings.useBoundaryMarker === true);

        var MARKER_PRESETS = ["---", "===", "###", "***", "///", "自由入力"];
        var dropMarker = markerRow.add("dropdownlist", undefined, MARKER_PRESETS);
        dropMarker.preferredSize = [70, 22];

        var initPresetIdx = 0;
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
            initPresetIdx = MARKER_PRESETS.length - 1;
        }
        dropMarker.selection = initPresetIdx;

        var customMarkerInput = markerRow.add("edittext", undefined, currentSavedMarker);
        customMarkerInput.characters = 6;
        customMarkerInput.enabled = (dropMarker.selection && dropMarker.selection.text === "自由入力");

        var markerStatusRow = splitRuleBox.add("group");
        markerStatusRow.margins = [20, 0, 0, 0];
        var markerStatusLbl = markerStatusRow.add("statictext", undefined, "[OK] 使用可能");
        markerStatusLbl.graphics.foregroundColor = markerStatusLbl.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.2, 0.5, 0.2, 1], 1);

        function validateMarkerUI() {
            if (!chkMarker.value) {
                markerStatusLbl.text = "";
                markerStatusRow.visible = false;
                return;
            }
            markerStatusRow.visible = true;
            var selText = dropMarker.selection ? dropMarker.selection.text : "";
            var mkr = (selText === "自由入力") ? customMarkerInput.text : (selText || "---");
            var res = PlaceTextParser.validateBoundaryMarker(mkr);
            if (res.valid) {
                markerStatusLbl.text = "[OK] " + res.message;
                markerStatusLbl.graphics.foregroundColor = markerStatusLbl.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.2, 0.5, 0.2, 1], 1);
            } else {
                markerStatusLbl.text = "[!] " + res.message;
                markerStatusLbl.graphics.foregroundColor = markerStatusLbl.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.8, 0.2, 0.2, 1], 1);
            }
        }

        dropMarker.onChange = function () {
            if (!dropMarker.selection) return;
            var selText = dropMarker.selection.text;
            if (selText === "自由入力") {
                customMarkerInput.enabled = true;
                customMarkerInput.active = true;
            } else {
                customMarkerInput.enabled = false;
                customMarkerInput.text = selText;
            }
            validateMarkerUI();
        };

        customMarkerInput.onChanging = function () {
            validateMarkerUI();
        };

        // 条件の検索方法 (OR検索 / AND検索)
        var condRow = splitRuleBox.add("group");
        condRow.orientation = "row";
        condRow.alignChildren = ["left", "center"];
        condRow.spacing = 10;
        condRow.margins = [10, 2, 0, 2];

        condRow.add("statictext", undefined, "検索条件:");
        var rbOr = condRow.add("radiobutton", undefined, "OR検索");
        var rbAnd = condRow.add("radiobutton", undefined, "AND検索");
        if (settings.boundaryMode === "and") {
            rbAnd.value = true;
        } else {
            rbOr.value = true;
        }

        // 空行の数 行
        var rowBlankLines = splitRuleBox.add("group");
        rowBlankLines.orientation = "row";
        rowBlankLines.alignChildren = ["left", "center"];
        rowBlankLines.spacing = 6;
        rowBlankLines.margins = [0, 2, 0, 2];

        var chkBlankLines = rowBlankLines.add("checkbox", undefined, "空行の数 :");
        chkBlankLines.value = (settings.useBlankLines !== false);

        var blankLinesInput = rowBlankLines.add("edittext", undefined, String(settings.blankLinesCount || 1));
        blankLinesInput.characters = 4;
        blankLinesInput.justify = "right";

        rowBlankLines.add("statictext", undefined, "行 (この行数をオブジェクト境界と判定)");

        // Markdown見出し行
        var rowMarkdown = splitRuleBox.add("group");
        rowMarkdown.orientation = "row";
        rowMarkdown.alignChildren = ["left", "center"];
        rowMarkdown.spacing = 6;
        var chkMarkdownHeaders = rowMarkdown.add("checkbox", undefined, "Markdown見出し (#) で自動分割");
        chkMarkdownHeaders.value = (settings.useMarkdownHeaders !== false);
        chkMarkdownHeaders.helpTip = "行頭が # で始まる見出し行を自動的に独立したポイント文字ブロックとして切り分けます。";

        // --- パネル2: ブロック種別判定ルール ---
        var typeRuleBox = leftSettingsCol.add("panel", undefined, "2. ブロック種別（タイプ）判定ルール");
        typeRuleBox.orientation = "column";
        typeRuleBox.alignChildren = "fill";
        typeRuleBox.spacing = 5;
        typeRuleBox.margins = [12, 14, 12, 10];

        var typeRuleHeader = typeRuleBox.add("group");
        typeRuleHeader.orientation = "row";
        typeRuleHeader.alignChildren = ["fill", "center"];
        var lblTypeRuleTitle = typeRuleHeader.add("statictext", undefined, "ポイント文字 / エリア内文字の判定");
        lblTypeRuleTitle.graphics.foregroundColor = lblTypeRuleTitle.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.35, 0.35, 0.35, 1], 1);
        createInfoIcon(typeRuleHeader, "【ブロック種別（タイプ）判定ルール】\n切り分けた各ブロックを「ポイント文字」とするか「エリア内文字」とするかを決定します。\n・自動判定: 文字数閾値（初期値30文字以上）および簡易マーカー（[P]/[A]）に基づいて自動判別\n・一括強制モード: すべてのブロックを一律にポイント文字またはエリア内文字として生成（※分割ルールは有効に維持されます）", "ブロック種別判定ルール");

        var rbTypeAuto = typeRuleBox.add("radiobutton", undefined, "自動判定 (文字数閾値 / マーカー)");
        var autoSubGroup = typeRuleBox.add("group");
        autoSubGroup.orientation = "column";
        autoSubGroup.alignChildren = "left";
        autoSubGroup.spacing = 4;
        autoSubGroup.margins = [20, 2, 0, 4];

        var rowCharThreshold = autoSubGroup.add("group");
        rowCharThreshold.orientation = "row";
        rowCharThreshold.alignChildren = ["left", "center"];
        rowCharThreshold.spacing = 6;

        var chkCharThreshold = rowCharThreshold.add("checkbox", undefined, "文字数 :");
        chkCharThreshold.value = (settings.useCharThreshold !== false);

        var thresholdInput = rowCharThreshold.add("edittext", undefined, String(settings.autoTagThreshold || 30));
        thresholdInput.characters = 4;
        thresholdInput.justify = "right";

        rowCharThreshold.add("statictext", undefined, "文字以上をエリア内文字と判定");

        var rowTypeMarkers = autoSubGroup.add("group");
        rowTypeMarkers.orientation = "row";
        rowTypeMarkers.alignChildren = ["left", "center"];
        var chkTypeMarkers = rowTypeMarkers.add("checkbox", undefined, "簡易マーカー [P]/[A], (P)/(A) を種別指定として認識");
        chkTypeMarkers.value = (settings.useTypeMarkers !== false);
        chkTypeMarkers.helpTip = "ブロック先頭にある [P], [A], (P), (A) を種別ヒントとして解釈し、本文から除去して指定種別を適用します。";

        var rbAllPoint = typeRuleBox.add("radiobutton", undefined, "すべてポイント文字 (一括強制)");
        var rbAllArea = typeRuleBox.add("radiobutton", undefined, "すべてエリア内文字 (一括強制)");

        if (settings.detectMode === "all_point") {
            rbAllPoint.value = true;
        } else if (settings.detectMode === "all_area") {
            rbAllArea.value = true;
        } else {
            rbTypeAuto.value = true;
        }

        // サブ項目の連動処理（分割ルールは種別一括モードでも決して無効化しない！）
        function updateSubParamsState() {
            var isAuto = rbTypeAuto.value;
            chkCharThreshold.enabled = isAuto;
            thresholdInput.enabled = isAuto && chkCharThreshold.value;
            chkTypeMarkers.enabled = isAuto;

            dropMarker.enabled = chkMarker.value;
            customMarkerInput.enabled = chkMarker.value && (dropMarker.selection && dropMarker.selection.text === "自由入力");
            rbOr.enabled = chkMarker.value;
            rbAnd.enabled = chkMarker.value;
            blankLinesInput.enabled = chkBlankLines.value;

            validateMarkerUI();
        }

        rbTypeAuto.onClick = updateSubParamsState;
        rbAllPoint.onClick = updateSubParamsState;
        rbAllArea.onClick = updateSubParamsState;
        chkMarker.onClick = updateSubParamsState;
        chkCharThreshold.onClick = updateSubParamsState;
        chkBlankLines.onClick = updateSubParamsState;
        updateSubParamsState();

        // --- パネル3: ポイント文字設定 ---
        var pointBox = rightSettingsCol.add("panel", undefined, "3. ポイント文字");
        pointBox.orientation = "column";
        pointBox.alignChildren = "fill";
        pointBox.spacing = 4;
        pointBox.margins = [12, 14, 12, 10];

        var pointHeader = pointBox.add("group");
        pointHeader.orientation = "row";
        pointHeader.alignChildren = ["fill", "center"];
        var lblPointHeader = pointHeader.add("statictext", undefined, "見出し・キャッチコピー用の標準設定");
        lblPointHeader.graphics.foregroundColor = lblPointHeader.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.35, 0.35, 0.35, 1], 1);
        createInfoIcon(pointHeader, "【ポイント文字設定】\nポイント文字の標準文字サイズ（pt/mm/inch）およびフォント（PostScript名）を指定します。未指定の場合はIllustratorの既定フォントが適用されます。", "ポイント文字設定");

        var rowPSize = createSettingRow(pointBox, "文字サイズ:", settings.pointSize, settings.pointSizeUnit || "pt", 5);
        var rowPFont = createFontSettingRow(pointBox, "フォント:", settings.pointFont);

        // --- パネル4: エリア内文字設定 ---
        var areaBox = rightSettingsCol.add("panel", undefined, "4. エリア内文字");
        areaBox.orientation = "column";
        areaBox.alignChildren = "fill";
        areaBox.spacing = 4;
        areaBox.margins = [12, 14, 12, 10];

        var areaHeader = areaBox.add("group");
        areaHeader.orientation = "row";
        areaHeader.alignChildren = ["fill", "center"];
        var lblAreaHeader = areaHeader.add("statictext", undefined, "本文・段落テキスト用の標準設定");
        lblAreaHeader.graphics.foregroundColor = lblAreaHeader.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.35, 0.35, 0.35, 1], 1);
        createInfoIcon(areaHeader, "【エリア内文字設定】\nエリア内文字の標準文字サイズ、フレーム横幅、フレーム高さ（0=文字量から自動計算）、およびフォントを指定します。", "エリア内文字設定");

        var rowASize = createSettingRow(areaBox, "文字サイズ:", settings.areaSize, settings.areaSizeUnit || "pt", 5);
        var rowAWidth = createSettingRow(areaBox, "エリア幅:", settings.areaWidth, settings.areaWidthUnit || "pt", 6);
        var rowAHeight = createSettingRow(areaBox, "エリア高さ (0=自動):", settings.areaHeight || 0, settings.areaHeightUnit || "pt", 6);
        var rowAFont = createFontSettingRow(areaBox, "フォント:", settings.areaFont);

        // --- パネル5: 配置設定 ---
        var layoutBox = rightSettingsCol.add("panel", undefined, "5. 配置設定");
        layoutBox.orientation = "column";
        layoutBox.alignChildren = "fill";
        layoutBox.spacing = 4;
        layoutBox.margins = [12, 14, 12, 10];

        var layoutHeader = layoutBox.add("group");
        layoutHeader.orientation = "row";
        layoutHeader.alignChildren = ["fill", "center"];
        var lblLayoutHeader = layoutHeader.add("statictext", undefined, "スタック配置・書字方向の設定");
        lblLayoutHeader.graphics.foregroundColor = lblLayoutHeader.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.35, 0.35, 0.35, 1], 1);
        createInfoIcon(layoutHeader, "【配置設定】\n・書字方向: 横書き (水平・上から下へ配置) / 縦書き (垂直・右から左へ配置)\n・オブジェクト間隔: オブジェクト同士の余白（マージン）\n・配置基準: 選択オブジェクト直下 / アートボード余白基準", "配置設定");

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

        var rowSpacing = createSettingRow(layoutBox, "オブジェクト間隔:", settings.spacing, settings.spacingUnit || "pt", 5);

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

        tabbedPanel.selection = tabEditor;

        // =========================================================
        // 最下部: ステータス＆アクション
        // =========================================================
        var bottomBar = win.add("group");
        bottomBar.orientation = "row";
        bottomBar.alignChildren = ["fill", "center"];
        bottomBar.spacing = 10;

        var statusText = bottomBar.add("statictext", undefined, "ステータス : テキストが入力されていません (モデル表示中)");
        statusText.preferredSize = [475, 22];
        statusText.graphics.foregroundColor = statusText.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.2, 0.45, 0.2, 1], 1);

        // 通常展開時のアクションボタン群
        var normalActionBtns = bottomBar.add("group");
        normalActionBtns.orientation = "row";
        normalActionBtns.spacing = 8;
        normalActionBtns.alignment = "right";

        var previewBtn = normalActionBtns.add("button", undefined, "プレビュー");
        var applyBtn = normalActionBtns.add("button", undefined, "テキスト作成");
        var cancelBtn = normalActionBtns.add("button", undefined, "キャンセル");
        createInfoIcon(normalActionBtns, "【プレビュー】一時的なテキストオブジェクトをアートボード上に生成して配置レイアウトを確認します。ウィンドウをコンパクトに畳み、プレビュー確認に集中できます。\n【テキスト作成】テキストオブジェクトを確定配置してダイアログを閉じます。", "アクション");

        // プレビュー時（畳み時）の3ボタン群
        var previewActionBtns = bottomBar.add("group");
        previewActionBtns.orientation = "row";
        previewActionBtns.spacing = 8;
        previewActionBtns.alignment = "right";
        previewActionBtns.visible = false;

        var btnReturnToEdit = previewActionBtns.add("button", undefined, "編集に戻る");
        var btnConfirmPreview = previewActionBtns.add("button", undefined, "確定");
        var btnCancelPreview = previewActionBtns.add("button", undefined, "キャンセル");

        // -------------------------
        // ブロック一覧・インスペクタ制御関数
        // -------------------------

        function syncSettingsFromUI() {
            if (rbAllPoint.value) {
                settings.detectMode = "all_point";
            } else if (rbAllArea.value) {
                settings.detectMode = "all_area";
            } else {
                settings.detectMode = "auto";
            }

            // 境界設定 (解釈A)
            settings.boundaryMode = rbAnd.value ? "and" : "or";
            settings.useBoundaryMarker = chkMarker.value;
            var markerSelText = (dropMarker && dropMarker.selection) ? dropMarker.selection.text : "";
            if (markerSelText === "自由入力") {
                settings.boundaryMarker = customMarkerInput.text;
            } else if (markerSelText) {
                settings.boundaryMarker = markerSelText;
            }
            settings.useBlankLines = chkBlankLines.value;
            settings.blankLinesCount = parseInt(blankLinesInput.text, 10) || 1;
            settings.useMarkdownHeaders = chkMarkdownHeaders.value;

            // 種別判定設定
            settings.useTypeMarkers = chkTypeMarkers.value;
            settings.useCharThreshold = chkCharThreshold.value;
            settings.autoTagThreshold = parseInt(thresholdInput.text, 10) || 30;

            // 書字方向
            settings.textOrientation = rbVertical.value ? "vertical" : "horizontal";

            // ポイント文字
            settings.pointSize = parseFloat(rowPSize.edit.text) || 14;
            if (rowPSize.unitDrop && rowPSize.unitDrop.selection) {
                settings.pointSizeUnit = rowPSize.unitDrop.selection.text;
            }
            settings.pointFont = rowPFont.getFont();

            // エリア内文字
            settings.areaSize = parseFloat(rowASize.edit.text) || 10;
            if (rowASize.unitDrop && rowASize.unitDrop.selection) {
                settings.areaSizeUnit = rowASize.unitDrop.selection.text;
            }
            settings.areaWidth = parseFloat(rowAWidth.edit.text) || 300;
            if (rowAWidth.unitDrop && rowAWidth.unitDrop.selection) {
                settings.areaWidthUnit = rowAWidth.unitDrop.selection.text;
            }
            settings.areaHeight = parseFloat(rowAHeight.edit.text) || 0;
            if (rowAHeight.unitDrop && rowAHeight.unitDrop.selection) {
                settings.areaHeightUnit = rowAHeight.unitDrop.selection.text;
            }
            settings.areaFont = rowAFont.getFont();

            // 配置
            settings.spacing = parseFloat(rowSpacing.edit.text) || 20;
            if (rowSpacing.unitDrop && rowSpacing.unitDrop.selection) {
                settings.spacingUnit = rowSpacing.unitDrop.selection.text;
            }
            settings.baseMode = rbArtboard.value ? "artboard" : "selection";

            PlaceTextConfig.saveSettings(settings);
            return settings;
        }

        function updateListBoxRow(idx) {
            if (idx < 0 || idx >= blockItems.length || !blockList.items || idx >= blockList.items.length) return;
            var summary = PlaceTextParser.formatBlockSummary(blockItems[idx]);
            var li = blockList.items[idx];
            li.text = String(idx + 1);
            if (li.subItems && li.subItems.length >= 3) {
                li.subItems[0].text = summary.typeLabel;
                li.subItems[1].text = summary.sizeLabel;
                li.subItems[2].text = summary.previewText;
            }
        }

        function normalizeToCRLF(str) {
            return (str || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n/g, "\r\n");
        }

        function getActiveHistory() {
            if (activeEditor === "inspector" && inspectorBox.enabled && selectedBlockIndex >= 0 && selectedBlockIndex < blockItems.length) {
                return blockTextHistory;
            }
            return inputHistory;
        }

        function updateHistoryButtonsUI() {
            var hist = getActiveHistory();
            btnUndo.enabled = hist.canUndo();
            btnRedo.enabled = hist.canRedo();
        }

        function recordInputHistory() {
            if (isApplyingHistory || isPlaceholder) return;
            inputHistory.push(getRealInputText());
            updateHistoryButtonsUI();
        }

        function recordBlockTextHistory() {
            if (isApplyingHistory || isUpdatingInspector || selectedBlockIndex < 0 || selectedBlockIndex >= blockItems.length) return;
            blockTextHistory.push(editBlockText.text || "");
            updateHistoryButtonsUI();
        }

        function insertTabIntoEditor(targetEditor) {
            lastTabInsertTime = new Date().getTime();
            var useInspector = (targetEditor === "inspector" && inspectorBox.enabled && selectedBlockIndex >= 0 && selectedBlockIndex < blockItems.length);

            if (useInspector) {
                activeEditor = "inspector";
                lastFocusedEditorBeforeTab = "inspector";
                editBlockText.active = true;
                var beforeBlock = editBlockText.text || "";
                try {
                    editBlockText.textselection = "\t";
                } catch (e) {}
                if (editBlockText.text === beforeBlock) {
                    editBlockText.text = beforeBlock + "\t";
                }
                blockItems[selectedBlockIndex].text = PlaceTextParser.cleanText(editBlockText.text);
                updateListBoxRow(selectedBlockIndex);
                recordBlockTextHistory();
                statusText.text = "ステータス : 選択ブロック本文にタブ文字を挿入しました";
            } else {
                activeEditor = "input";
                lastFocusedEditorBeforeTab = "input";
                if (isPlaceholder || inputBox.text === PLACEHOLDER_TEXT) {
                    hidePlaceholder();
                }
                inputBox.active = true;
                var beforeInput = inputBox.text || "";
                try {
                    inputBox.textselection = "\t";
                } catch (e) {}
                if (inputBox.text === beforeInput) {
                    inputBox.text = beforeInput + "\t";
                }
                isInputDirty = true;
                recordInputHistory();
                var real = getRealInputText();
                statusText.text = "ステータス : 原稿入力欄にタブ文字を挿入しました (" + real.length + " 文字)";
            }
        }

        function performUndo() {
            var useInspector = (activeEditor === "inspector" && inspectorBox.enabled && selectedBlockIndex >= 0 && selectedBlockIndex < blockItems.length);
            if (useInspector) {
                if (!blockTextHistory.canUndo()) return false;
                isApplyingHistory = true;
                var prevBlock = blockTextHistory.undo();
                if (prevBlock !== null) {
                    editBlockText.text = normalizeToCRLF(prevBlock);
                    blockItems[selectedBlockIndex].text = PlaceTextParser.cleanText(editBlockText.text);
                    updateListBoxRow(selectedBlockIndex);
                    statusText.text = "ステータス : 選択ブロック本文の編集を元に戻しました";
                }
                isApplyingHistory = false;
                editBlockText.active = true;
                updateHistoryButtonsUI();
                return true;
            } else {
                if (!inputHistory.canUndo()) return false;
                isApplyingHistory = true;
                var prevInput = inputHistory.undo();
                if (prevInput !== null) {
                    isPlaceholder = false;
                    inputBox.text = normalizeToCRLF(prevInput);
                    isInputDirty = true;
                    statusText.text = "ステータス : 原稿テキストの編集を元に戻しました (" + prevInput.length + " 文字)";
                }
                isApplyingHistory = false;
                inputBox.active = true;
                updateHistoryButtonsUI();
                return true;
            }
        }

        function performRedo() {
            var useInspector = (activeEditor === "inspector" && inspectorBox.enabled && selectedBlockIndex >= 0 && selectedBlockIndex < blockItems.length);
            if (useInspector) {
                if (!blockTextHistory.canRedo()) return false;
                isApplyingHistory = true;
                var nextBlock = blockTextHistory.redo();
                if (nextBlock !== null) {
                    editBlockText.text = normalizeToCRLF(nextBlock);
                    blockItems[selectedBlockIndex].text = PlaceTextParser.cleanText(editBlockText.text);
                    updateListBoxRow(selectedBlockIndex);
                    statusText.text = "ステータス : 選択ブロック本文の編集をやり直しました";
                }
                isApplyingHistory = false;
                editBlockText.active = true;
                updateHistoryButtonsUI();
                return true;
            } else {
                if (!inputHistory.canRedo()) return false;
                isApplyingHistory = true;
                var nextInput = inputHistory.redo();
                if (nextInput !== null) {
                    isPlaceholder = false;
                    inputBox.text = normalizeToCRLF(nextInput);
                    isInputDirty = true;
                    statusText.text = "ステータス : 原稿テキストの編集をやり直しました (" + nextInput.length + " 文字)";
                }
                isApplyingHistory = false;
                inputBox.active = true;
                updateHistoryButtonsUI();
                return true;
            }
        }

        function attachEditorKeyboardSupport(editCtrl, editorType) {
            try {
                editCtrl.addEventListener("keydown", function (ev) {
                    if (!ev) return;
                    var k = ev.keyName ? String(ev.keyName).toUpperCase() : "";
                    var isCtrl = !!(ev.ctrlKey || ev.metaKey);
                    var isShift = !!ev.shiftKey;

                    if (k === "TAB" && !isCtrl && !ev.altKey && !isShift) {
                        if (ev.preventDefault) ev.preventDefault();
                        if (ev.stopPropagation) ev.stopPropagation();
                        insertTabIntoEditor(editorType);
                    } else if (isCtrl && !ev.altKey && k === "Z") {
                        if (ev.preventDefault) ev.preventDefault();
                        if (ev.stopPropagation) ev.stopPropagation();
                        if (isShift) {
                            performRedo();
                        } else {
                            performUndo();
                        }
                    } else if (isCtrl && !ev.altKey && k === "Y") {
                        if (ev.preventDefault) ev.preventDefault();
                        if (ev.stopPropagation) ev.stopPropagation();
                        performRedo();
                    }
                });
            } catch (e) {}
        }

        attachEditorKeyboardSupport(inputBox, "input");
        attachEditorKeyboardSupport(editBlockText, "inspector");

        // Windows環境でTabキーが次コントロールへのフォーカス移動として横取りされた場合のフォールバック
        splitBtn.onActivate = function () {
            try {
                var kb = ScriptUI.environment.keyboardState;
                var now = new Date().getTime();
                if (kb && kb.keyName === "Tab" && !kb.shiftKey && !kb.ctrlKey && !kb.altKey && lastFocusedEditorBeforeTab === "input" && (now - lastTabInsertTime > 150)) {
                    insertTabIntoEditor("input");
                }
            } catch (e) {}
        };

        previewBtn.onActivate = function () {
            try {
                var kb = ScriptUI.environment.keyboardState;
                var now = new Date().getTime();
                if (kb && kb.keyName === "Tab" && !kb.shiftKey && !kb.ctrlKey && !kb.altKey && lastFocusedEditorBeforeTab === "inspector" && (now - lastTabInsertTime > 150)) {
                    insertTabIntoEditor("inspector");
                }
            } catch (e) {}
        };

        function loadSelectedBlockToInspector() {
            isUpdatingInspector = true;
            if (selectedBlockIndex < 0 || selectedBlockIndex >= blockItems.length) {
                inspectorBox.enabled = false;
                rbBlockPoint.value = true;
                rbBlockArea.value = false;
                editBlockSize.text = "";
                editBlockWidth.text = "";
                editBlockHeight.text = "";
                editBlockText.text = "";
                blockTextHistory.reset("");
                isUpdatingInspector = false;
                updateHistoryButtonsUI();
                return;
            }

            var item = blockItems[selectedBlockIndex];
            inspectorBox.enabled = true;
            var isArea = (item.type === "area");
            rbBlockPoint.value = !isArea;
            rbBlockArea.value = isArea;
            editBlockSize.text = String(item.sizeVal);
            lblBlockSizeUnit.text = item.sizeUnit || "pt";
            editBlockWidth.text = String(item.widthVal);
            lblBlockWidthUnit.text = item.widthUnit || "pt";
            editBlockHeight.text = String(item.heightVal);
            lblBlockHeightUnit.text = item.heightUnit || "pt";
            editBlockWidth.enabled = isArea;
            editBlockHeight.enabled = isArea;

            var normalizedCRLF = normalizeToCRLF(item.text || "");
            editBlockText.text = normalizedCRLF;
            blockTextHistory.reset(normalizedCRLF);
            isUpdatingInspector = false;
            updateHistoryButtonsUI();
        }

        function rebuildBlockListUI(selectIdx) {
            blockList.removeAll();
            for (var i = 0; i < blockItems.length; i++) {
                var summary = PlaceTextParser.formatBlockSummary(blockItems[i]);
                var li = blockList.add("item", String(i + 1));
                if (li.subItems && li.subItems.length >= 3) {
                    li.subItems[0].text = summary.typeLabel;
                    li.subItems[1].text = summary.sizeLabel;
                    li.subItems[2].text = summary.previewText;
                }
            }

            if (blockItems.length === 0) {
                selectedBlockIndex = -1;
                loadSelectedBlockToInspector();
            } else {
                var targetIdx = (typeof selectIdx === "number" && selectIdx >= 0 && selectIdx < blockItems.length) ? selectIdx : 0;
                selectedBlockIndex = targetIdx;
                blockList.selection = targetIdx;
                loadSelectedBlockToInspector();
            }
        }

        function splitAndPopulateBlocks() {
            var currentSettings = syncSettingsFromUI();
            var realText = getRealInputText();
            if (realText.replace(/\s+/g, "").length === 0) {
                PlaceTextErrors.showAlert(PlaceTextErrors.CODES.EMPTY_TEXT);
                return false;
            }
            blockItems = PlaceTextParser.createBlockItems(realText, currentSettings);
            isInputDirty = false;
            rebuildBlockListUI(0);
            statusText.text = "ステータス : ブロック分割・自動判定完了 (" + blockItems.length + " ブロック)";
            return blockItems.length > 0;
        }

        // -------------------------
        // イベントハンドラ
        // -------------------------

        inputBox.onChanging = function () {
            if (isPlaceholder) {
                isPlaceholder = false;
            }
            isInputDirty = true;
            recordInputHistory();
            var real = getRealInputText();
            if (real.replace(/\s+/g, "").length === 0) {
                statusText.text = "ステータス : テキストが入力されていません";
            } else {
                statusText.text = "ステータス : 原稿入力中 (" + real.length + " 文字)";
            }
        };

        loadFileBtn.onClick = function () {
            try {
                var res = PlaceTextIO.chooseAndLoadFile();
                if (res && res.content) {
                    isPlaceholder = false;
                    // Windows ScriptUI multiline edittext は \r\n (CRLF) が必須
                    var normalizedText = normalizeToCRLF(res.content);
                    inputBox.text = normalizedText;
                    inputBox.active = true;
                    activeEditor = "input";
                    recordInputHistory();
                    lblCurrentSource.text = "ソース : " + res.name;
                    var currentSettings = syncSettingsFromUI();
                    blockItems = PlaceTextParser.createBlockItems(res.content, currentSettings);
                    isInputDirty = false;
                    rebuildBlockListUI(0);
                    statusText.text = "ステータス : ファイル読込＆ブロック展開完了 (" + res.name + " / " + blockItems.length + " ブロック)";
                }
            } catch (err) {
                PlaceTextErrors.showAlert(PlaceTextErrors.CODES.FILE_IO_FAILED, err.message, err.line);
            }
        };

        function loadFromSelection() {
            try {
                if (!app.selection || app.selection.length === 0) {
                    alert("Illustrator上でテキストオブジェクト（TextFrame）を選択してください。", "PlaceText - 選択から取得");
                    return;
                }
                var frames = [];
                for (var i = 0; i < app.selection.length; i++) {
                    var itm = app.selection[i];
                    if (itm && itm.typename === "TextFrame") {
                        frames.push(itm);
                    }
                }
                if (frames.length === 0) {
                    alert("選択項目の中に未アウトライン化のテキストオブジェクトが見つかりませんでした。", "PlaceText - 選択から取得");
                    return;
                }

                // 上から下へ配置順（Y座標降順：topが大きい順）にソート
                frames.sort(function (a, b) {
                    return b.top - a.top;
                });

                var contentsList = [];
                for (var j = 0; j < frames.length; j++) {
                    var c = frames[j].contents || "";
                    if (c.replace(/\s+/g, "").length > 0) {
                        contentsList.push(c);
                    }
                }

                if (contentsList.length === 0) {
                    alert("選択されたテキストオブジェクト内に有効な文字が含まれていません。", "PlaceText - 選択から取得");
                    return;
                }

                var combined = contentsList.join("\r\n\r\n");
                isPlaceholder = false;
                var normalizedText = normalizeToCRLF(combined);
                inputBox.text = normalizedText;
                inputBox.active = true;
                activeEditor = "input";
                recordInputHistory();
                lblCurrentSource.text = "ソース : 選択オブジェクト (" + frames.length + " 件)";

                var currentSettings = syncSettingsFromUI();
                blockItems = PlaceTextParser.createBlockItems(combined, currentSettings);
                isInputDirty = false;
                rebuildBlockListUI(0);
                statusText.text = "ステータス : 選択から取得＆ブロック展開完了 (" + frames.length + " 件 / " + blockItems.length + " ブロック)";
            } catch (err) {
                PlaceTextErrors.showAlert(PlaceTextErrors.CODES.PARSE_FAILED, err.message, err.line);
            }
        }

        loadSelectionBtn.onClick = loadFromSelection;

        clearTextBtn.onClick = function () {
            var currentReal = getRealInputText();
            if (currentReal.length > 0) {
                inputHistory.push(currentReal);
                inputHistory.push("");
            }
            activeEditor = "input";
            blockItems = [];
            selectedBlockIndex = -1;
            rebuildBlockListUI(-1);
            showPlaceholder();
            lblCurrentSource.text = "ソース : 直接入力";
            updateHistoryButtonsUI();
            clearPreview();
            statusText.text = "ステータス : テキストとブロック一覧を消去しました ([元に戻す]で復元可能)";
        };

        btnInsertTab.onClick = function () {
            insertTabIntoEditor(activeEditor);
        };

        btnUndo.onClick = function () {
            performUndo();
        };

        btnRedo.onClick = function () {
            performRedo();
        };

        splitBtn.onClick = function () {
            try {
                splitAndPopulateBlocks();
            } catch (err) {
                PlaceTextErrors.showAlert(PlaceTextErrors.CODES.PARSE_FAILED, err.message, err.line);
            }
        };

        // ListBox 選択変更・ダブルクリック
        blockList.onChange = function () {
            if (!blockList.selection) {
                selectedBlockIndex = -1;
            } else {
                selectedBlockIndex = blockList.selection.index;
            }
            loadSelectedBlockToInspector();
        };

        blockList.onDoubleClick = function () {
            if (!blockList.selection) return;
            var idx = blockList.selection.index;
            if (idx < 0 || idx >= blockItems.length) return;
            var currentSettings = syncSettingsFromUI();
            var item = blockItems[idx];
            var newType = (item.type === "area") ? "point" : "area";
            PlaceTextParser.applyTypeDefaults(item, newType, currentSettings);
            selectedBlockIndex = idx;
            updateListBoxRow(idx);
            loadSelectedBlockToInspector();
            statusText.text = "ステータス : ブロック #" + (idx + 1) + " を「" + (newType === "area" ? "エリア内文字" : "ポイント文字") + "」に切り替えました";
        };

        // ブロック操作ツールバーボタン
        btnAddBlock.onClick = function () {
            var currentSettings = syncSettingsFromUI();
            var newItem = PlaceTextParser.createBlockItem("新規テキスト", "point", currentSettings);
            var insertIdx = (selectedBlockIndex >= 0 && selectedBlockIndex < blockItems.length) ? (selectedBlockIndex + 1) : blockItems.length;
            blockItems.splice(insertIdx, 0, newItem);
            isInputDirty = false;
            rebuildBlockListUI(insertIdx);
            editBlockText.active = true;
            statusText.text = "ステータス : ブロック #" + (insertIdx + 1) + " を追加しました";
        };

        btnRemoveBlock.onClick = function () {
            if (selectedBlockIndex < 0 || selectedBlockIndex >= blockItems.length) return;
            var removedNo = selectedBlockIndex + 1;
            blockItems.splice(selectedBlockIndex, 1);
            var nextIdx = Math.min(selectedBlockIndex, blockItems.length - 1);
            rebuildBlockListUI(nextIdx);
            statusText.text = "ステータス : ブロック #" + removedNo + " を削除しました (残り " + blockItems.length + " ブロック)";
        };

        btnMergeUp.onClick = function () {
            if (selectedBlockIndex <= 0 || selectedBlockIndex >= blockItems.length) return;
            var currentSettings = syncSettingsFromUI();
            var prevIdx = selectedBlockIndex - 1;
            var prevItem = blockItems[prevIdx];
            var currItem = blockItems[selectedBlockIndex];
            prevItem.text = PlaceTextParser.cleanText(prevItem.text + "\n\n" + currItem.text);
            // 結合後に文字数閾値を超えた場合はエリア内文字へ自動昇格
            if (prevItem.type === "point" && PlaceTextParser.inferBlockType(prevItem.text, currentSettings) === "area") {
                PlaceTextParser.applyTypeDefaults(prevItem, "area", currentSettings);
            }
            blockItems.splice(selectedBlockIndex, 1);
            rebuildBlockListUI(prevIdx);
            statusText.text = "ステータス : ブロック #" + (prevIdx + 1) + " に結合しました";
        };

        btnMoveUp.onClick = function () {
            if (selectedBlockIndex <= 0 || selectedBlockIndex >= blockItems.length) return;
            var targetIdx = selectedBlockIndex - 1;
            var tmp = blockItems[targetIdx];
            blockItems[targetIdx] = blockItems[selectedBlockIndex];
            blockItems[selectedBlockIndex] = tmp;
            rebuildBlockListUI(targetIdx);
            statusText.text = "ステータス : ブロックを1つ上へ移動しました";
        };

        btnMoveDown.onClick = function () {
            if (selectedBlockIndex < 0 || selectedBlockIndex >= blockItems.length - 1) return;
            var targetIdx = selectedBlockIndex + 1;
            var tmp = blockItems[targetIdx];
            blockItems[targetIdx] = blockItems[selectedBlockIndex];
            blockItems[selectedBlockIndex] = tmp;
            rebuildBlockListUI(targetIdx);
            statusText.text = "ステータス : ブロックを1つ下へ移動しました";
        };

        // インスペクタでの個別メタデータ編集イベント
        rbBlockPoint.onClick = function () {
            if (isUpdatingInspector || selectedBlockIndex < 0 || selectedBlockIndex >= blockItems.length) return;
            var currentSettings = syncSettingsFromUI();
            PlaceTextParser.applyTypeDefaults(blockItems[selectedBlockIndex], "point", currentSettings);
            updateListBoxRow(selectedBlockIndex);
            loadSelectedBlockToInspector();
        };

        rbBlockArea.onClick = function () {
            if (isUpdatingInspector || selectedBlockIndex < 0 || selectedBlockIndex >= blockItems.length) return;
            var currentSettings = syncSettingsFromUI();
            PlaceTextParser.applyTypeDefaults(blockItems[selectedBlockIndex], "area", currentSettings);
            updateListBoxRow(selectedBlockIndex);
            loadSelectedBlockToInspector();
        };

        editBlockSize.onChanging = function () {
            if (isUpdatingInspector || selectedBlockIndex < 0 || selectedBlockIndex >= blockItems.length) return;
            var val = parseFloat(editBlockSize.text);
            if (!isNaN(val) && val > 0) {
                blockItems[selectedBlockIndex].sizeVal = val;
                PlaceTextParser.syncBlockItemPt(blockItems[selectedBlockIndex]);
                updateListBoxRow(selectedBlockIndex);
            }
        };

        editBlockWidth.onChanging = function () {
            if (isUpdatingInspector || selectedBlockIndex < 0 || selectedBlockIndex >= blockItems.length) return;
            var val = parseFloat(editBlockWidth.text);
            if (!isNaN(val) && val > 0) {
                blockItems[selectedBlockIndex].widthVal = val;
                PlaceTextParser.syncBlockItemPt(blockItems[selectedBlockIndex]);
                updateListBoxRow(selectedBlockIndex);
            }
        };

        editBlockHeight.onChanging = function () {
            if (isUpdatingInspector || selectedBlockIndex < 0 || selectedBlockIndex >= blockItems.length) return;
            var val = parseFloat(editBlockHeight.text);
            if (!isNaN(val) && val >= 0) {
                blockItems[selectedBlockIndex].heightVal = val;
                PlaceTextParser.syncBlockItemPt(blockItems[selectedBlockIndex]);
                updateListBoxRow(selectedBlockIndex);
            }
        };

        editBlockText.onChanging = function () {
            if (isUpdatingInspector || selectedBlockIndex < 0 || selectedBlockIndex >= blockItems.length) return;
            blockItems[selectedBlockIndex].text = PlaceTextParser.cleanText(editBlockText.text);
            updateListBoxRow(selectedBlockIndex);
            recordBlockTextHistory();
        };

        function ensureBlocksReady() {
            if (blockItems.length === 0 || isInputDirty) {
                var realText = getRealInputText();
                if (realText.replace(/\s+/g, "").length > 0) {
                    splitAndPopulateBlocks();
                }
            }
            var validItems = [];
            for (var i = 0; i < blockItems.length; i++) {
                if (blockItems[i] && blockItems[i].text && blockItems[i].text.replace(/\s+/g, "").length > 0) {
                    PlaceTextParser.syncBlockItemPt(blockItems[i]);
                    validItems.push(blockItems[i]);
                }
            }
            return validItems;
        }

        function collapseToPreviewMode() {
            if (isCollapsed) return;
            isCollapsed = true;

            if (win.size && win.size.width > 400 && win.size.height > 200) {
                fullWindowSize = [win.size.width, win.size.height];
            }
            try {
                lastActiveTab = tabbedPanel.selection;
            } catch (e) {
                lastActiveTab = tabEditor;
            }

            // 1. ラッパーグループを非表示にし、最大サイズ・要求サイズをゼロにして完全にフットプリントを消失させる
            mainContentGroup.visible = false;
            mainContentGroup.maximumSize = [0, 0];
            mainContentGroup.preferredSize = [0, 0];

            // 2. ボタンバーの切り替え
            normalActionBtns.visible = false;
            previewActionBtns.visible = true;

            statusText.preferredSize = [270, 22];
            win.text = PlaceTextConfig.APP_NAME + " v" + PlaceTextConfig.APP_VERSION + " - プレビュー確認中";

            // 3. ウィンドウをコンパクトサイズ（幅640px × ミニバー高さ）へリサイズ
            win.layout.layout(true);
            win.size = [640, 85];
            win.layout.layout(true);
            win.layout.resize();
        }

        function expandToEditMode() {
            if (!isCollapsed) return;
            isCollapsed = false;

            // 1. ラッパーグループのサイズ制限を解除し、可視化する
            mainContentGroup.maximumSize = [5000, 5000];
            mainContentGroup.preferredSize = [-1, -1];
            mainContentGroup.visible = true;

            // 2. ボタンバーの切り替え
            previewActionBtns.visible = false;
            normalActionBtns.visible = true;

            statusText.preferredSize = [475, 22];
            win.text = PlaceTextConfig.APP_NAME + " v" + PlaceTextConfig.APP_VERSION;

            // 3. 元のウィンドウサイズに復帰
            if (fullWindowSize) {
                win.size = [fullWindowSize[0], fullWindowSize[1]];
            }

            // 4. タブ選択状態の明示的復帰（タブの中身が消えるバグを解消）
            if (lastActiveTab) {
                tabbedPanel.selection = lastActiveTab;
            } else {
                tabbedPanel.selection = tabEditor;
            }

            // 5. レイアウトを強制再計算
            win.layout.layout(true);
            if (tabbedPanel.selection && tabbedPanel.selection.layout) {
                try {
                    tabbedPanel.selection.layout.layout(true);
                } catch (e) {}
            }
            win.layout.resize();
        }

        previewBtn.onClick = function () {
            try {
                clearPreview();
                var currentSettings = syncSettingsFromUI();
                var items = ensureBlocksReady();
                if (items.length === 0) {
                    PlaceTextErrors.showAlert(PlaceTextErrors.CODES.EMPTY_TEXT);
                    return;
                }
                previewObjects = PlaceTextLayout.createStackLayout(doc, items, currentSettings, true);
                app.redraw();
                statusText.text = "ステータス : プレビュー表示中 (" + previewObjects.length + " 件)";
                collapseToPreviewMode();
            } catch (err) {
                PlaceTextErrors.showAlert(PlaceTextErrors.CODES.PREVIEW_FAILED, err.message, err.line);
            }
        };

        btnReturnToEdit.onClick = function () {
            expandToEditMode();
            statusText.text = "ステータス : 編集画面に復帰しました (プレビュー保持中)";
        };

        function executeApply() {
            try {
                clearPreview();
                var currentSettings = syncSettingsFromUI();
                var items = ensureBlocksReady();
                if (items.length === 0) {
                    PlaceTextErrors.showAlert(PlaceTextErrors.CODES.EMPTY_TEXT);
                    return;
                }
                var created = PlaceTextLayout.createStackLayout(doc, items, currentSettings, false);
                win.close(1);
            } catch (err) {
                PlaceTextErrors.showAlert(PlaceTextErrors.CODES.LAYOUT_FAILED, err.message, err.line);
            }
        }

        applyBtn.onClick = executeApply;
        btnConfirmPreview.onClick = executeApply;

        cancelBtn.onClick = function () {
            clearPreview();
            win.close(0);
        };
        btnCancelPreview.onClick = cancelBtn.onClick;

        win.onClose = function () {
            clearPreview();
        };

        win.onResizing = win.onResize = function () {
            this.layout.resize();
        };

        win.onShow = function () {
            if (win.size && win.size.width > 400 && win.size.height > 200) {
                fullWindowSize = [win.size.width, win.size.height];
            }
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
