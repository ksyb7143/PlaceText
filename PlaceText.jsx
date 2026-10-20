#target illustrator

/**
 * PlaceText - Adobe Illustrator Text Batch Placement Script
 * @version 1.0.0
 * @build 2026-10-21 04:33:11
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
    var APP_VERSION = "1.0.0";

    var DEFAULT_SETTINGS = {
        version: APP_VERSION,
        // 判定モード: "auto" | "all_point" | "all_area"
        detectMode: "auto",

        // 境界判定設定 (解釈A)
        boundaryMode: "or",       // "or" | "and"
        useBoundaryMarker: false, // 特定の境界マーカーを使用するか
        boundaryMarker: "---",    // 境界マーカー文字列 (半角英数記号5文字以内)
        useBlankLines: true,      // 空行による境界判定を使用するか
        blankLinesCount: 1,       // 境界とする空行の数
        useMarkdownHeaders: true, // 後方互換: 形式ごとの分割を使用するか
        useFormatSplit: true,     // 検索条件B: テキストの形式による分割を使用するか

        // テキスト形式 (解釈形式): "md" | "txt" | "csv"
        formatType: "md",
        // 標準設定タブ「解釈形式ごとの設定」で表示中のパネル: "md" | "csv"
        settingsFormatView: "md",

        // Markdown記法詳細設定
        mdHeadingMode: "independent_point", // "independent" | "independent_point" | "independent_area" | "merge_next" | "merge_h1"
        mdHeadingSymbol: "hide",       // "hide" (作成時除去) | "source" (そのまま)
        mdUseHeadingSizes: false,      // 見出しごとの文字サイズ個別設定
        mdHeadingSizeUnit: "pt",       // 見出し文字サイズ単位 ("pt" | "mm" | "px")
        mdHeadingSizes: {
            h1: 24,
            h2: 20,
            h3: 16,
            h4: 14,
            h5: 12,
            h6: 10
        },
        mdListMode: "item",            // "item" (項目ごと) | "nested" (親ごと) | "block" (全体で1ユニット)
        mdListSymbol: "hide",          // "hide" (作成時除去) | "source" (そのまま) | "convert_list" (リスト形式変換)
        mdCommentMode: "ignore",       // "ignore" (作成時除去) | "source" (そのまま)

        // CSV/TSV詳細設定
        csvSplitMode: "cell",          // "cell" (セルごと) | "row" (行ごと) | "col" (列ごと) | "table" (表全体で1ユニット)
        csvColJoiner: "tab",           // "tab" (\t) | "space" ( ) | "fullspace" (　) | "comma" (,) | "slash" ( / )
        csvHeaderMode: "include",      // "include" (通常のデータとして含める) | "skip" (1行目を除外する)
        csvDelimiter: "auto",          // "auto" (自動判定) | "comma" (カンマ固定) | "tab" (タブ固定)

        // 種別判定設定 (エリア内文字 / ポイント文字)
        useTypeMarkers: true,     // ブロック先頭の簡易マーカー [P]/[A], (P)/(A) を認識するか
        useCharThreshold: true,   // 文字数閾値を使用するか
        autoTagThreshold: 30,     // これ以上の文字数をエリア内文字と判定

        // ポイント文字設定
        pointSize: 14,
        pointSizeUnit: "pt", // "pt" | "mm" | "px" | "inch"
        pointOrientation: "horizontal", // "horizontal" | "vertical"
        pointFont: "",       // "" = デフォルト (未指定)
        pointJustification: "left", // "left" | "center" | "right" | "justify"

        // エリア内文字設定
        areaSize: 10,
        areaSizeUnit: "pt",
        areaOrientation: "horizontal", // "horizontal" | "vertical"
        areaWidth: 300,
        areaWidthUnit: "pt",
        areaHeight: 0,
        areaHeightUnit: "pt", // 0は自動
        areaLineLength: 300,
        areaLineLengthUnit: "pt",
        areaLineCount: 0,
        areaLineCountUnit: "行", // 0は自動
        areaFont: "",        // "" = デフォルト (未指定)
        areaJustification: "left", // "left" | "center" | "right" | "justify"
        areaVerticalJustification: "top", // "top" | "center" | "bottom" | "justify"

        // 配置設定
        spacing: 20,
        spacingUnit: "pt",
        baseMode: "selection", // "selection" | "artboard"
        artboardMarginX: 30,
        artboardMarginY: 30,
        textOrientation: "horizontal", // "horizontal" (横書き) | "vertical" (縦書き)

        // 拡張配置設定 (ポップアップ対応)
        layoutMode: "stack_v", // "stack_v" (縦1列) | "stack_h" (横1列) | "grid_col" (グリッド列数指定) | "grid_row" (グリッド行数指定)
        gridColumns: 3,
        gridRows: 2,
        rowSpacing: 20,
        rowSpacingUnit: "pt",
        colSpacing: 20,
        colSpacingUnit: "pt",
        sameSpacing: true
    };

    // 単位変換係数 (基準: pt)
    var UNIT_FACTORS = {
        "pt": 1.0,
        "px": 1.0,
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
                if (key === "mdHeadingSizes") {
                    target.mdHeadingSizes = {};
                    var srcSizes = (src && src.mdHeadingSizes) ? src.mdHeadingSizes : DEFAULT_SETTINGS.mdHeadingSizes;
                    for (var h = 1; h <= 6; h++) {
                        var hk = "h" + h;
                        target.mdHeadingSizes[hk] = (srcSizes && srcSizes.hasOwnProperty(hk)) ? srcSizes[hk] : DEFAULT_SETTINGS.mdHeadingSizes[hk];
                    }
                } else {
                    target[key] = (src && src.hasOwnProperty(key)) ? src[key] : DEFAULT_SETTINGS[key];
                }
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

    function exportSettingsToFile(settings, targetFile) {
        if (!targetFile) return false;
        try {
            targetFile.encoding = "UTF-8";
            targetFile.open("w");
            targetFile.write(stringify(settings));
            targetFile.close();
            return true;
        } catch (e) {
            return false;
        }
    }

    function importSettingsFromFile(sourceFile) {
        if (!sourceFile || !sourceFile.exists) return null;
        try {
            sourceFile.encoding = "UTF-8";
            sourceFile.open("r");
            var content = sourceFile.read();
            sourceFile.close();
            var parsed = parse(content);
            if (!parsed) return null;
            return cloneSettings(parsed);
        } catch (e) {
            return null;
        }
    }

    function resetSettings() {
        var fresh = cloneSettings(DEFAULT_SETTINGS);
        saveSettings(fresh);
        return fresh;
    }

    return {
        APP_NAME: APP_NAME,
        APP_VERSION: APP_VERSION,
        DEFAULT_SETTINGS: DEFAULT_SETTINGS,
        toPt: toPt,
        fromPt: fromPt,
        loadSettings: loadSettings,
        saveSettings: saveSettings,
        resetSettings: resetSettings,
        exportSettingsToFile: exportSettingsToFile,
        importSettingsFromFile: importSettingsFromFile,
        cloneSettings: cloneSettings,
        stringify: stringify,
        parse: parse
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
        CONFIG_FAILED: "ERR_008",
        UNKNOWN_ERROR: "ERR_999"
    };

    var MESSAGES = {};
    MESSAGES[CODES.NO_DOCUMENT] = "ドキュメントが開かれていません。アートボードを開いてから実行してください。";
    MESSAGES[CODES.TARGET_LAYER_INVALID] = "編集可能なレイヤーが見つかりません。レイヤーが非表示またはロックされていないか確認してください。";
    MESSAGES[CODES.EMPTY_TEXT] = "配置するテキストがありません。テキストを入力してください。";
    MESSAGES[CODES.PARSE_FAILED] = "テキストのユニット分割・解析処理に失敗しました。";
    MESSAGES[CODES.LAYOUT_FAILED] = "テキストオブジェクトの生成またはレイアウト配置に失敗しました。";
    MESSAGES[CODES.FILE_IO_FAILED] = "ファイルの読み込みに失敗しました。";
    MESSAGES[CODES.PREVIEW_FAILED] = "プレビューの生成処理に失敗しました。";
    MESSAGES[CODES.CONFIG_FAILED] = "設定の読み込みまたは保存に失敗しました。";
    MESSAGES[CODES.UNKNOWN_ERROR] = "予期しないエラーが発生しました。";

    function formatMessage(code, detailMsg, lineNo) {
        var base = (code && MESSAGES[code]) ? MESSAGES[code] : "不明なエラーが発生しました。";
        var res = (code ? "[" + code + "] " : "[ERR] ") + base;
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

        // 形式ごとの分割フラグ (useFormatSplit 優先、後方互換で useMarkdownHeaders を参照)
        var useFmt = (!settings) ? true : ((settings.useFormatSplit !== undefined) ? (settings.useFormatSplit !== false) : (settings.useMarkdownHeaders !== false));

        // CSV・TSV形式の場合はマーカー・空行分割を適用せず表構造のみで分割
        if (settings && settings.formatType === "csv" && useFmt) {
            var csvItems = createCSVBlockItems(text, settings);
            var csvBlocks = [];
            for (var ci = 0; ci < csvItems.length; ci++) {
                csvBlocks.push(csvItems[ci].text);
            }
            return csvBlocks;
        }

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

        // Markdown記法による自動切り分け (formatType === "md" かつ useFormatSplit / useMarkdownHeaders が有効な場合)
        var isMarkdown = (!settings || settings.formatType === "md" || (settings.formatType === undefined && useFmt));
        if (isMarkdown && useFmt && rawBlocks.length > 0) {
            rawBlocks = processMarkdownBlocks(rawBlocks, settings || {});
        }

        return rawBlocks;
    }

    /**
     * Markdown原稿の高度な構造分割処理（見出し・箇条書き）
     */
    function processMarkdownBlocks(blocks, settings) {
        var headingMode = settings.mdHeadingMode || "independent_point"; // "independent" | "independent_point" | "independent_area" | "merge_next" | "merge_h1"
        var listMode = settings.mdListMode || "item";               // "item" | "nested" | "block"
        var isIndependentHeading = (headingMode === "independent" || headingMode === "independent_point" || headingMode === "independent_area");

        // 1. 見出し分割
        var afterHeadings = [];
        for (var b = 0; b < blocks.length; b++) {
            var blk = blocks[b];
            var lines = blk.split(/\r?\n/);
            var chunks = [];
            var currentChunk = [];

            for (var j = 0; j < lines.length; j++) {
                var line = lines[j];
                var isH1 = /^#\s+/.test(line);
                var isAnyH = /^#{1,6}\s+/.test(line);

                var isSplitPoint = false;
                if (isIndependentHeading) {
                    isSplitPoint = isAnyH;
                } else if (headingMode === "merge_next") {
                    isSplitPoint = isAnyH;
                } else if (headingMode === "merge_h1") {
                    isSplitPoint = isH1;
                }

                if (isSplitPoint) {
                    if (currentChunk.length > 0) {
                        var chunkStr = cleanText(currentChunk.join("\n"));
                        if (chunkStr.length > 0) chunks.push(chunkStr);
                        currentChunk = [];
                    }
                    if (isIndependentHeading) {
                        var headerLine = cleanText(line);
                        if (headerLine.length > 0) chunks.push(headerLine);
                        continue;
                    }
                }
                currentChunk.push(line);
            }
            if (currentChunk.length > 0) {
                var finalChunkStr = cleanText(currentChunk.join("\n"));
                if (finalChunkStr.length > 0) chunks.push(finalChunkStr);
            }

            for (var c = 0; c < chunks.length; c++) {
                afterHeadings.push(chunks[c]);
            }
        }

        // 2. 箇条書き分割 (独立見出しや非見出しブロックに対して適用)
        var finalBlocks = [];
        for (var k = 0; k < afterHeadings.length; k++) {
            var target = afterHeadings[k];
            // 見出し結合モードで複数行かつ先頭が見出しの場合は、箇条書き分割せずそのまま1ユニットとする
            if ((headingMode === "merge_next" || headingMode === "merge_h1") && /^#{1,6}\s+/.test(target)) {
                finalBlocks.push(target);
                continue;
            }

            var listChunks = splitListBlock(target, listMode);
            for (var lc = 0; lc < listChunks.length; lc++) {
                finalBlocks.push(listChunks[lc]);
            }
        }

        return finalBlocks;
    }

    /**
     * 箇条書きブロックを行・ネスト構造に応じて分割
     */
    function splitListBlock(text, mode) {
        if (!text) return [];
        var lines = text.split(/\r?\n/);
        var hasList = false;
        for (var i = 0; i < lines.length; i++) {
            if (/^[ \t]*(?:[-*+]|\d+\.)\s+/.test(lines[i])) {
                hasList = true;
                break;
            }
        }
        if (!hasList || mode === "block") {
            return [text];
        }

        var results = [];
        var currentItemLines = [];

        if (mode === "item") {
            // リスト項目ごとに独立分割
            for (var j = 0; j < lines.length; j++) {
                var l = lines[j];
                if (/^[ \t]*(?:[-*+]|\d+\.)\s+/.test(l)) {
                    if (currentItemLines.length > 0) {
                        var resStr = cleanText(currentItemLines.join("\n"));
                        if (resStr.length > 0) results.push(resStr);
                        currentItemLines = [];
                    }
                }
                currentItemLines.push(l);
            }
            if (currentItemLines.length > 0) {
                var lastStr = cleanText(currentItemLines.join("\n"));
                if (lastStr.length > 0) results.push(lastStr);
            }
        } else if (mode === "nested") {
            // 親リスト (ネスト含む) ごとに分割 (浅いインデントの親ごとにグループ化)
            var currentIndent = -1;
            for (var n = 0; n < lines.length; n++) {
                var nl = lines[n];
                var m = nl.match(/^([ \t]*)(?:[-*+]|\d+\.)\s+/);
                if (m) {
                    var indent = m[1].replace(/\t/g, "    ").length;
                    if (currentIndent === -1 || indent <= currentIndent) {
                        // 新しい親項目の開始
                        if (currentItemLines.length > 0) {
                            var nStr = cleanText(currentItemLines.join("\n"));
                            if (nStr.length > 0) results.push(nStr);
                            currentItemLines = [];
                        }
                        currentIndent = indent;
                    }
                }
                currentItemLines.push(nl);
            }
            if (currentItemLines.length > 0) {
                var finalNStr = cleanText(currentItemLines.join("\n"));
                if (finalNStr.length > 0) results.push(finalNStr);
            }
        }

        return (results.length > 0) ? results : [text];
    }

    /**
     * テキスト作成用のクリーンアップ（Markdown記号・コメント除去処理）
     */
    function cleanUnitTextForCreation(text, settings) {
        if (!text) return "";
        var res = text;
        var s = settings || PlaceTextConfig.DEFAULT_SETTINGS;

        if (s.formatType === "txt" || s.formatType === "csv") {
            return cleanText(res);
        }

        // 1. コメントアウト処理 (%%...%% / <!--...-->)
        if (s.mdCommentMode !== "source") {
            res = res.replace(/%%[\s\S]*?%%/g, "");
            res = res.replace(/<!--[\s\S]*?-->/g, "");
        }

        // 2. 見出し記号 (#) の処理
        if (s.mdHeadingSymbol === "hide") {
            res = res.replace(/^#{1,6}[ \t]+/gm, "");
        }

        // 3. 箇条書き記号の処理
        if (s.mdListSymbol === "hide") {
            res = res.replace(/^[ \t]*(?:[-*+](?:[ \t]+\[[ xX]\])?|\d+\.)[ \t]+/gm, "");
        } else if (s.mdListSymbol === "convert_list") {
            res = res.replace(/^([ \t]*)(?:[-*+](?:[ \t]+\[[ xX]\])?)[ \t]+/gm, "$1・");
        }

        return cleanText(res);
    }

    /**
     * エディタ制御文字の可視化エスケープ / 復元
     * タブ、改行、復帰、垂直タブ、改ページ、ヌル文字、不可視空白、各種制御文字に対応
     */
    function escapeControlChars(str) {
        if (!str) return "";
        // 1. バックスラッシュ自身をまずエスケープ
        var res = str.replace(/\\/g, "\\\\");

        // 2. 制御文字・不可視文字をエスケープ
        res = res.replace(/[\x00-\x1F\x7F\u00A0\u2000-\u200F\u2028\u2029\u202F\u205F\uFEFF]/g, function (ch) {
            switch (ch) {
                case "\0": return "\\0";
                case "\x07": return "\\a";
                case "\b": return "\\b";
                case "\t": return "\\t";
                case "\n": return "\\n";
                case "\v": return "\\v";
                case "\f": return "\\f";
                case "\r": return "\\r";
                case "\x1B": return "\\e";
                case "\u00A0": return "\\u00A0";
                case "\u200B": return "\\u200B";
                case "\u200C": return "\\u200C";
                case "\u200D": return "\\u200D";
                case "\u200E": return "\\u200E";
                case "\u200F": return "\\u200F";
                case "\u2028": return "\\u2028";
                case "\u2029": return "\\u2029";
                case "\uFEFF": return "\\uFEFF";
                default:
                    var code = ch.charCodeAt(0);
                    if (code < 256) {
                        var hex = code.toString(16).toLowerCase();
                        return "\\x" + (hex.length < 2 ? "0" + hex : hex);
                    } else {
                        var uhex = code.toString(16).toUpperCase();
                        while (uhex.length < 4) uhex = "0" + uhex;
                        return "\\u" + uhex;
                    }
            }
        });

        return res;
    }

    function unescapeControlChars(str) {
        if (!str) return "";
        // 単一正規表現によるレキサー方式でエスケープシーケンスをパース（\\ の誤認識を防止）
        return str.replace(/\\(\\|[0abtnvfre]|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4})/g, function (match, p1) {
            if (p1 === "\\") return "\\";
            if (p1 === "0") return "\0";
            if (p1 === "a") return "\x07";
            if (p1 === "b") return "\b";
            if (p1 === "t") return "\t";
            if (p1 === "n") return "\n";
            if (p1 === "v") return "\v";
            if (p1 === "f") return "\f";
            if (p1 === "r") return "\r";
            if (p1 === "e") return "\x1B";
            if (p1.charAt(0) === "x" || p1.charAt(0) === "X") {
                return String.fromCharCode(parseInt(p1.substring(1), 16));
            }
            if (p1.charAt(0) === "u" || p1.charAt(0) === "U") {
                return String.fromCharCode(parseInt(p1.substring(1), 16));
            }
            return match;
        });
    }

    /**
     * 見出しレベル (1〜6) を判定する。見出しでなければ 0 を返す
     */
    function inferHeadingLevel(text) {
        if (!text) return 0;
        var clean = text.replace(/^(\[[PApa]\]|\([PApa]\))[ \t]*/, "");
        var m = clean.match(/^(#{1,6})[ \t]+/);
        return m ? m[1].length : 0;
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
        var useFmt = (!settings) ? true : ((settings.useFormatSplit !== undefined) ? (settings.useFormatSplit !== false) : (settings.useMarkdownHeaders !== false));
        var isMd = (!settings || settings.formatType === "md" || settings.formatType === undefined);
        var hideHeadingSym = (!settings || settings.mdHeadingSymbol !== "source");
        if (useFmt && isMd && hideHeadingSym) {
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

        // 2. Markdown見出し (#) の判定
        var useFmt = (!settings) ? true : ((settings.useFormatSplit !== undefined) ? (settings.useFormatSplit !== false) : (settings.useMarkdownHeaders !== false));
        var isMd = (!settings || settings.formatType === "md" || settings.formatType === undefined);
        if (useFmt && isMd && clean.length > 0) {
            if (/^#{1,6}\s+/.test(clean)) {
                if (settings && settings.mdHeadingMode === "independent_area") {
                    return "area";
                }
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
     * ブロックアイテムの表示単位値 (sizeVal, widthVal, heightVal, lineLengthVal, lineCountVal) から pt 値を再計算する
     */
    function syncBlockItemPt(item) {
        if (!item) return item;
        item.size = PlaceTextConfig.toPt(item.sizeVal, item.sizeUnit || "pt");

        // widthVal と lineLengthVal の同期（どちらかが更新されていれば他方に反映）
        if (item.lineLengthVal !== undefined && item.widthVal !== undefined) {
            if (item._lastWidthVal !== undefined && item._lastWidthVal !== item.widthVal) {
                item.lineLengthVal = item.widthVal;
                item.lineLengthUnit = item.widthUnit;
            } else if (item._lastLineLengthVal !== undefined && item._lastLineLengthVal !== item.lineLengthVal) {
                item.widthVal = item.lineLengthVal;
                item.widthUnit = item.lineLengthUnit;
            }
        } else if (item.lineLengthVal !== undefined) {
            item.widthVal = item.lineLengthVal;
            item.widthUnit = item.lineLengthUnit || "pt";
        } else if (item.widthVal !== undefined) {
            item.lineLengthVal = item.widthVal;
            item.lineLengthUnit = item.widthUnit || "pt";
        }
        item._lastWidthVal = item.widthVal;
        item._lastLineLengthVal = item.lineLengthVal;

        item.width = PlaceTextConfig.toPt(item.widthVal, item.widthUnit || "pt");
        item.lineLength = item.width;

        // heightVal と lineCountVal の同期
        if (item.lineCountVal !== undefined && item.heightVal !== undefined) {
            if (item._lastHeightVal !== undefined && item._lastHeightVal !== item.heightVal) {
                item.lineCountVal = item.heightVal;
                item.lineCountUnit = item.heightUnit;
            } else if (item._lastLineCountVal !== undefined && item._lastLineCountVal !== item.lineCountVal) {
                item.heightVal = item.lineCountVal;
                item.heightUnit = item.lineCountUnit;
            }
        } else if (item.lineCountVal !== undefined) {
            item.heightVal = item.lineCountVal;
            item.heightUnit = item.lineCountUnit || "pt";
        } else if (item.heightVal !== undefined) {
            item.lineCountVal = item.heightVal;
            item.lineCountUnit = item.heightUnit || "pt";
        }
        item._lastHeightVal = item.heightVal;
        item._lastLineCountVal = item.lineCountVal;

        item.height = PlaceTextConfig.toPt(item.heightVal, item.heightUnit || "pt");
        item.lineCount = item.lineCountVal || 0;

        return item;
    }

    /**
     * 単一のブロック/ユニットメタデータオブジェクトを生成する
     */
    function createBlockItem(blockText, type, settings) {
        var s = settings || PlaceTextConfig.DEFAULT_SETTINGS;
        var resolvedType = (type === "area" || type === "point") ? type : inferBlockType(blockText, s);
        var isArea = (resolvedType === "area");
        var strippedText = cleanText(stripTypeMarker(blockText || "", s));

        var sizeVal = isArea ? (s.areaSize || 10) : (s.pointSize || 14);
        var sizeUnit = isArea ? (s.areaSizeUnit || "pt") : (s.pointSizeUnit || "pt");

        // 見出し個別文字サイズの適用
        var hLevel = inferHeadingLevel(blockText);
        if (hLevel > 0 && s.mdUseHeadingSizes === true && s.mdHeadingSizes) {
            var customHSize = s.mdHeadingSizes["h" + hLevel];
            if (customHSize && typeof customHSize === "number") {
                sizeVal = customHSize;
                sizeUnit = s.mdHeadingSizeUnit || "pt";
            }
        }

        var widthVal = s.areaLineLength || s.areaWidth || 300;
        var widthUnit = s.areaLineLengthUnit || s.areaWidthUnit || "pt";
        var heightVal = (s.areaLineCount !== undefined) ? s.areaLineCount : (s.areaHeight || 0);
        var heightUnit = s.areaLineCountUnit || s.areaHeightUnit || "行";
        var font = isArea ? (s.areaFont || "") : (s.pointFont || "");
        var justification = isArea ? (s.areaJustification || "left") : (s.pointJustification || "left");
        var verticalJustification = isArea ? (s.areaVerticalJustification || "top") : "top";
        var orientation = isArea
            ? (s.areaOrientation || s.textOrientation || "horizontal")
            : (s.pointOrientation || s.textOrientation || "horizontal");

        var item = {
            type: resolvedType,
            orientation: orientation, // "horizontal" | "vertical"
            sizeVal: sizeVal,
            sizeUnit: sizeUnit,
            lineLengthVal: widthVal,
            lineLengthUnit: widthUnit,
            lineCountVal: heightVal,
            lineCountUnit: heightUnit,
            widthVal: widthVal,
            widthUnit: widthUnit,
            heightVal: heightVal,
            heightUnit: heightUnit,
            size: 0,
            width: 0,
            height: 0,
            lineLength: 0,
            lineCount: 0,
            font: font,
            justification: justification,
            verticalJustification: verticalJustification,
            headingLevel: hLevel,
            isSelected: false,
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
        var wVal = s.areaLineLength || s.areaWidth || 300;
        var wUnit = s.areaLineLengthUnit || s.areaWidthUnit || "pt";
        var hVal = (s.areaLineCount !== undefined) ? s.areaLineCount : (s.areaHeight || 0);
        var hUnit = s.areaLineCountUnit || s.areaHeightUnit || "行";
        item.widthVal = wVal;
        item.widthUnit = wUnit;
        item.lineLengthVal = wVal;
        item.lineLengthUnit = wUnit;
        item.heightVal = hVal;
        item.heightUnit = hUnit;
        item.lineCountVal = hVal;
        item.lineCountUnit = hUnit;
        item.font = isArea ? (s.areaFont || "") : (s.pointFont || "");
        return syncBlockItemPt(item);
    }

    /**
     * CSV結合文字コードから実文字列を取得する
     */
    function getCsvColJoinerString(joinerCode) {
        if (joinerCode === "space") return " ";
        if (joinerCode === "fullspace") return "\u3000";
        if (joinerCode === "comma") return ",";
        if (joinerCode === "slash") return " / ";
        return "\t"; // default "tab"
    }

    /**
     * RFC 4180 準拠の CSV / TSV パーサー
     * クォート内の改行・区切り文字・エスケープされたダブルクォート ("") を正しく処理し、
     * 最大列数 M に合わせて不足セルを空文字 "" でパディングした矩形2次元配列を返す。
     * @param {string} rawText
     * @param {string} [delimiterMode="auto"] "auto" | "comma" | "tab"
     * @returns {{ rows: Array<Array<string>>, numRows: number, numCols: number, delimiter: string }}
     */
    function parseCSVTable(rawText, delimiterMode) {
        if (!rawText || typeof rawText !== "string") {
            return { rows: [], numRows: 0, numCols: 0, delimiter: "," };
        }
        var text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        if (text.replace(/[\s\u3000]/g, "").length === 0) {
            return { rows: [], numRows: 0, numCols: 0, delimiter: "," };
        }

        // 区切り文字の決定
        var delim = ",";
        if (delimiterMode === "tab") {
            delim = "\t";
        } else if (delimiterMode === "comma") {
            delim = ",";
        } else {
            // 自動判定: 先頭数行（クォート外）のタブ数とカンマ数を比較
            var tabCount = 0;
            var commaCount = 0;
            var inQ = false;
            var linesChecked = 0;
            for (var idx = 0; idx < text.length && linesChecked < 5; idx++) {
                var c = text.charAt(idx);
                if (c === '"') {
                    inQ = !inQ;
                } else if (!inQ) {
                    if (c === "\t") tabCount++;
                    else if (c === ",") commaCount++;
                    else if (c === "\n") linesChecked++;
                }
            }
            delim = (tabCount > commaCount && tabCount > 0) ? "\t" : ",";
        }

        var rows = [];
        var currentRow = [];
        var currentCell = "";
        var inQuotes = false;

        for (var p = 0; p < text.length; p++) {
            var ch = text.charAt(p);
            if (inQuotes) {
                if (ch === '"') {
                    if (p + 1 < text.length && text.charAt(p + 1) === '"') {
                        currentCell += '"';
                        p++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    currentCell += ch;
                }
            } else {
                if (ch === '"' && currentCell.length === 0) {
                    inQuotes = true;
                } else if (ch === delim) {
                    currentRow.push(currentCell);
                    currentCell = "";
                } else if (ch === "\n") {
                    currentRow.push(currentCell);
                    rows.push(currentRow);
                    currentRow = [];
                    currentCell = "";
                } else {
                    currentCell += ch;
                }
            }
        }
        if (currentCell.length > 0 || currentRow.length > 0) {
            currentRow.push(currentCell);
            rows.push(currentRow);
        }

        // 末尾の完全な空行（改行のみで終わった場合の1列空文字行）を除去
        while (rows.length > 0) {
            var lastRow = rows[rows.length - 1];
            if (lastRow.length === 1 && lastRow[0] === "") {
                rows.pop();
            } else {
                break;
            }
        }

        if (rows.length === 0) {
            return { rows: [], numRows: 0, numCols: 0, delimiter: delim };
        }

        var maxCols = 0;
        for (var r = 0; r < rows.length; r++) {
            if (rows[r].length > maxCols) maxCols = rows[r].length;
        }

        // 全行を maxCols に揃えて矩形化
        for (var r2 = 0; r2 < rows.length; r2++) {
            while (rows[r2].length < maxCols) {
                rows[r2].push("");
            }
        }

        return {
            rows: rows,
            numRows: rows.length,
            numCols: maxCols,
            delimiter: delim
        };
    }

    /**
     * CSV/TSV テキストから設定に応じた BlockItem 配列を生成する
     */
    function createCSVBlockItems(rawText, settings) {
        var s = settings || PlaceTextConfig.DEFAULT_SETTINGS;
        var parsed = parseCSVTable(rawText, s.csvDelimiter || "auto");
        if (parsed.numRows === 0 || parsed.numCols === 0) return [];

        var rows = parsed.rows;
        if (s.csvHeaderMode === "skip") {
            if (rows.length <= 1) return [];
            rows = rows.slice(1);
        }
        var numRows = rows.length;
        var numCols = parsed.numCols;
        var splitMode = s.csvSplitMode || "cell";
        var joiner = getCsvColJoinerString(s.csvColJoiner);
        var items = [];

        if (splitMode === "cell") {
            for (var r = 0; r < numRows; r++) {
                for (var c = 0; c < numCols; c++) {
                    var cellText = rows[r][c];
                    var trimmedCell = cleanText(cellText);
                    var type = inferBlockType(trimmedCell, s);
                    var item = createBlockItem(trimmedCell, type, s);
                    item.csvRow = r;
                    item.csvCol = c;
                    item.csvTotalRows = numRows;
                    item.csvTotalCols = numCols;
                    item.csvSplitMode = "cell";
                    item.isEmptyCell = (trimmedCell.length === 0);
                    items.push(item);
                }
            }
        } else if (splitMode === "row") {
            for (var r2 = 0; r2 < numRows; r2++) {
                var rowCells = [];
                for (var c2 = 0; c2 < numCols; c2++) {
                    rowCells.push(cleanText(rows[r2][c2]));
                }
                var rowStr = rowCells.join(joiner);
                if (cleanText(rowStr).length === 0) continue;
                var rowType = inferBlockType(rowStr, s);
                var rowItem = createBlockItem(rowStr, rowType, s);
                rowItem.csvRow = r2;
                rowItem.csvTotalRows = numRows;
                rowItem.csvTotalCols = numCols;
                rowItem.csvSplitMode = "row";
                items.push(rowItem);
            }
        } else if (splitMode === "col") {
            for (var c3 = 0; c3 < numCols; c3++) {
                var colCells = [];
                for (var r3 = 0; r3 < numRows; r3++) {
                    colCells.push(cleanText(rows[r3][c3]));
                }
                var colStr = colCells.join("\n");
                if (cleanText(colStr).length === 0) continue;
                var colType = inferBlockType(colStr, s);
                var colItem = createBlockItem(colStr, colType, s);
                colItem.csvCol = c3;
                colItem.csvTotalRows = numRows;
                colItem.csvTotalCols = numCols;
                colItem.csvSplitMode = "col";
                items.push(colItem);
            }
        } else if (splitMode === "table") {
            var tableLines = [];
            for (var r4 = 0; r4 < numRows; r4++) {
                var tRowCells = [];
                for (var c4 = 0; c4 < numCols; c4++) {
                    tRowCells.push(cleanText(rows[r4][c4]));
                }
                tableLines.push(tRowCells.join(joiner));
            }
            var tableStr = tableLines.join("\n");
            if (cleanText(tableStr).length > 0) {
                var tableType = inferBlockType(tableStr, s);
                var tableItem = createBlockItem(tableStr, tableType, s);
                tableItem.csvTotalRows = numRows;
                tableItem.csvTotalCols = numCols;
                tableItem.csvSplitMode = "table";
                items.push(tableItem);
            }
        }

        return items;
    }

    /**
     * 生テキストを分割し、各ブロックにメタデータを付与した配列を生成する（文中記法に一切依存しない）
     * 返却値: Array of BlockItem
     */
    function createBlockItems(rawText, settings) {
        if (!rawText) return [];
        var s = settings || PlaceTextConfig.DEFAULT_SETTINGS;
        var useFmt = (s.useFormatSplit !== undefined) ? s.useFormatSplit : true;
        if (s.formatType === "csv" && useFmt) {
            return createCSVBlockItems(rawText, s);
        }

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
        var isVert = (item.orientation === "vertical");
        var typeLabel = isArea ? (isVert ? "エリア(縦)" : "エリア") : (isVert ? "ポイント(縦)" : "ポイント");
        var sUnit = item.sizeUnit || "pt";
        var wUnit = item.widthUnit || item.lineLengthUnit || "pt";

        var sizeLabel = "";
        if (isArea) {
            var wVal = (item.widthVal !== undefined) ? item.widthVal : item.lineLengthVal;
            var hVal = (item.heightVal !== undefined) ? item.heightVal : item.lineCountVal;
            if (hVal && hVal > 0) {
                sizeLabel = item.sizeVal + sUnit + " / " + wVal + "x" + hVal + wUnit;
            } else {
                sizeLabel = item.sizeVal + sUnit + " / 幅" + wVal + wUnit;
            }
        } else {
            sizeLabel = item.sizeVal + sUnit;
        }

        var oneLine = (item.text || "").replace(/\r\n/g, " / ").replace(/\r/g, " / ").replace(/\n/g, " / ");
        if (item.isEmptyCell && cleanText(oneLine).length === 0) {
            oneLine = "[空セル]";
        }
        var previewText = (oneLine.length > 26) ? (oneLine.substring(0, 26) + "...") : oneLine;

        return {
            typeLabel: typeLabel,
            sizeLabel: sizeLabel,
            previewText: previewText
        };
    }

    /**
     * 新規生成されたユニット群に、旧ユニット群の手動カスタマイズ個別設定をスマートに引き継ぐ
     * @param {Array} newItems 新規パースされたBlockItem配列
     * @param {Array} oldItems 再分割前のBlockItem配列
     * @returns {Array} 個別設定が引き継がれたBlockItem配列
     */
    function mergeBlockItems(newItems, oldItems) {
        if (!newItems || newItems.length === 0) return [];
        if (!oldItems || oldItems.length === 0) return newItems;

        var usedOld = {};

        for (var i = 0; i < newItems.length; i++) {
            var nItem = newItems[i];
            var nText = cleanText(nItem.text);
            var matchedOld = null;
            var matchedIdx = -1;

            // 0. CSVセルモードの場合は同じ (csvRow, csvCol) かつ本文一致を最優先
            if (nItem.csvSplitMode === "cell" && nItem.csvRow !== undefined && nItem.csvCol !== undefined) {
                for (var cIdx = 0; cIdx < oldItems.length; cIdx++) {
                    if (usedOld[cIdx]) continue;
                    var oCell = oldItems[cIdx];
                    if (oCell && oCell.csvSplitMode === "cell" &&
                        oCell.csvRow === nItem.csvRow && oCell.csvCol === nItem.csvCol &&
                        cleanText(oCell.text) === nText) {
                        matchedOld = oCell;
                        matchedIdx = cIdx;
                        break;
                    }
                }
            }

            // 1. 本文完全一致で探索
            if (!matchedOld) {
                for (var j = 0; j < oldItems.length; j++) {
                    if (usedOld[j]) continue;
                    var oItem = oldItems[j];
                    if (!oItem) continue;
                    if (cleanText(oItem.text) === nText && (!nItem.isEmptyCell || oItem.isEmptyCell)) {
                        matchedOld = oItem;
                        matchedIdx = j;
                        break;
                    }
                }
            }

            // 2. 完全一致がなければ、先頭部分一致（誤字修正等の追従）
            if (!matchedOld && nText.length >= 6) {
                var nPrefix = nText.substring(0, Math.min(20, nText.length));
                for (var k = 0; k < oldItems.length; k++) {
                    if (usedOld[k]) continue;
                    var oText = cleanText(oldItems[k].text);
                    if (oText.indexOf(nPrefix) === 0 || nText.indexOf(oText.substring(0, Math.min(20, oText.length))) === 0) {
                        matchedOld = oldItems[k];
                        matchedIdx = k;
                        break;
                    }
                }
            }

            // 3. マッチした旧ユニットの設定を引き継ぐ
            if (matchedOld && (matchedOld.isCustomized || matchedOld.isDeleted)) {
                usedOld[matchedIdx] = true;
                nItem.isCustomized = true;
                nItem.customProps = matchedOld.customProps || {};

                if (matchedOld.customProps) {
                    if (matchedOld.customProps.type) nItem.type = matchedOld.type;
                    if (matchedOld.customProps.orientation) nItem.orientation = matchedOld.orientation;
                    if (matchedOld.customProps.size || matchedOld.customProps.sizeVal || matchedOld.customProps.sizeUnit) {
                        nItem.sizeVal = matchedOld.sizeVal;
                        nItem.sizeUnit = matchedOld.sizeUnit;
                    }
                    if (matchedOld.customProps.width || matchedOld.customProps.widthVal || matchedOld.customProps.widthUnit ||
                        matchedOld.customProps.lineLengthVal || matchedOld.customProps.lineLengthUnit) {
                        nItem.widthVal = matchedOld.widthVal;
                        nItem.widthUnit = matchedOld.widthUnit;
                        nItem.lineLengthVal = matchedOld.lineLengthVal !== undefined ? matchedOld.lineLengthVal : matchedOld.widthVal;
                        nItem.lineLengthUnit = matchedOld.lineLengthUnit || matchedOld.widthUnit;
                    }
                    if (matchedOld.customProps.height || matchedOld.customProps.heightVal || matchedOld.customProps.heightUnit ||
                        matchedOld.customProps.lineCountVal || matchedOld.customProps.lineCountUnit) {
                        nItem.heightVal = matchedOld.heightVal;
                        nItem.heightUnit = matchedOld.heightUnit;
                        nItem.lineCountVal = matchedOld.lineCountVal !== undefined ? matchedOld.lineCountVal : matchedOld.heightVal;
                        nItem.lineCountUnit = matchedOld.lineCountUnit || matchedOld.heightUnit;
                    }
                    if (matchedOld.customProps.justification) {
                        nItem.justification = matchedOld.justification;
                    }
                    if (matchedOld.customProps.verticalJustification) {
                        nItem.verticalJustification = matchedOld.verticalJustification;
                    }
                    if (matchedOld.customProps.font) {
                        nItem.font = matchedOld.font;
                    }
                } else {
                    // 全属性コピー
                    nItem.type = matchedOld.type;
                    nItem.orientation = matchedOld.orientation;
                    nItem.sizeVal = matchedOld.sizeVal;
                    nItem.sizeUnit = matchedOld.sizeUnit;
                    nItem.widthVal = matchedOld.widthVal;
                    nItem.widthUnit = matchedOld.widthUnit;
                    nItem.lineLengthVal = matchedOld.lineLengthVal !== undefined ? matchedOld.lineLengthVal : matchedOld.widthVal;
                    nItem.lineLengthUnit = matchedOld.lineLengthUnit || matchedOld.widthUnit;
                    nItem.heightVal = matchedOld.heightVal;
                    nItem.heightUnit = matchedOld.heightUnit;
                    nItem.lineCountVal = matchedOld.lineCountVal !== undefined ? matchedOld.lineCountVal : matchedOld.heightVal;
                    nItem.lineCountUnit = matchedOld.lineCountUnit || matchedOld.heightUnit;
                    nItem.justification = matchedOld.justification;
                    nItem.verticalJustification = matchedOld.verticalJustification;
                    nItem.font = matchedOld.font;
                }

                if (matchedOld.isDeleted) {
                    nItem.isDeleted = true;
                }
                if (matchedOld.isSelected) {
                    nItem.isSelected = true;
                }

                syncBlockItemPt(nItem);
            }
        }

        return newItems;
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
        stripTypeMarker: stripTypeMarker,

        // 新機能 & ユニット用エイリアス
        processMarkdownBlocks: processMarkdownBlocks,
        splitListBlock: splitListBlock,
        cleanUnitTextForCreation: cleanUnitTextForCreation,
        escapeControlChars: escapeControlChars,
        unescapeControlChars: unescapeControlChars,
        inferHeadingLevel: inferHeadingLevel,
        parseCSVTable: parseCSVTable,
        createCSVBlockItems: createCSVBlockItems,
        getCsvColJoinerString: getCsvColJoinerString,
        mergeBlockItems: mergeBlockItems,
        mergeUnitItems: mergeBlockItems,
        createUnitItem: createBlockItem,
        createUnitItems: createBlockItems,
        formatUnitSummary: formatBlockSummary
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
     * 段落の行揃え（Justification）を安全に適用
     */
    function applyJustificationSafe(frame, justificationStr) {
        if (!frame || !frame.textRange) return;
        try {
            if (typeof Justification === "undefined") return;
            var j = Justification.LEFT;
            switch (justificationStr) {
                case "center":
                    j = Justification.CENTER;
                    break;
                case "right":
                    j = Justification.RIGHT;
                    break;
                case "justify":
                    j = (typeof Justification.FULLJUSTIFY !== "undefined") ? Justification.FULLJUSTIFY : (Justification.LEFT || 0);
                    break;
                default:
                    j = Justification.LEFT;
                    break;
            }
            frame.textRange.paragraphAttributes.justification = j;
        } catch (e) {}
    }

    /**
     * エリア内文字の垂直配置（VerticalJustification）を安全に適用
     */
    function applyVerticalJustificationSafe(frame, vJustStr) {
        if (!frame) return;
        try {
            if (typeof VerticalJustification === "undefined") return;
            var vj = VerticalJustification.TOP;
            switch (vJustStr) {
                case "center":
                    vj = VerticalJustification.CENTER;
                    break;
                case "bottom":
                    vj = VerticalJustification.BOTTOM;
                    break;
                case "justify":
                    vj = VerticalJustification.JUSTIFY;
                    break;
                default:
                    vj = VerticalJustification.TOP;
                    break;
            }
            if (frame.story && frame.story.textFrameOptions) {
                frame.story.textFrameOptions.verticalJustification = vj;
            }
        } catch (e) {}
    }

    /**
     * テキストフレーム群をスマートスタック（横書き: 垂直スタック / 縦書き: 水平スタック）で配置
     */
    /**
     * テキストフレーム群を配置（縦1列 / 横1列 / N行M列グリッド）
     */
    function createStackLayout(doc, items, settings, isPreview) {
        if (!doc || !items || items.length === 0) return [];

        var targetLayer = getTargetLayer(doc);
        var base = getBasePosition(doc, settings);
        var baseX = base.x;
        var baseY = base.y;

        var isCsvFormat = (settings.formatType === "csv" && settings.useFormatSplit !== false);
        var csvSplitMode = settings.csvSplitMode || "cell";
        var layoutMode = settings.layoutMode || (settings.textOrientation === "vertical" ? "stack_h" : "stack_v");
        if (isCsvFormat) {
            if (csvSplitMode === "cell") layoutMode = "grid_col";
            else if (csvSplitMode === "row") layoutMode = "stack_v";
            else if (csvSplitMode === "col") layoutMode = "stack_h";
            else if (csvSplitMode === "table") layoutMode = "stack_v";
        }

        var rowSpacing = PlaceTextConfig.toPt(settings.rowSpacing !== undefined ? settings.rowSpacing : (settings.spacing || 20), settings.rowSpacingUnit || settings.spacingUnit || "pt");
        var colSpacing = PlaceTextConfig.toPt(settings.colSpacing !== undefined ? settings.colSpacing : (settings.spacing || 20), settings.colSpacingUnit || settings.spacingUnit || "pt");
        if (settings.sameSpacing !== false && settings.spacing !== undefined) {
            var sVal = PlaceTextConfig.toPt(settings.spacing, settings.spacingUnit || "pt");
            rowSpacing = sVal;
            colSpacing = sVal;
        }

        var isGlobalVertical = (settings.textOrientation === "vertical");

        // 有効なユニットのみ抽出（CSVセル分割時の空セル・削除済みセルはスキップしつつグリッド座標は維持）
        var validEntries = [];
        var csvDetectedCols = 0;
        var csvDetectedRows = 0;
        for (var i = 0; i < items.length; i++) {
            var itemObj = items[i];
            if (itemObj.csvTotalCols && itemObj.csvTotalCols > csvDetectedCols) {
                csvDetectedCols = itemObj.csvTotalCols;
            }
            if (itemObj.csvTotalRows && itemObj.csvTotalRows > csvDetectedRows) {
                csvDetectedRows = itemObj.csvTotalRows;
            }
            if (itemObj.isDeleted) continue;
            if (isCsvFormat && csvSplitMode === "cell") {
                var cellTrimmed = (itemObj.text || "").replace(/^[\s\u3000]+|[\s\u3000]+$/g, "");
                if (itemObj.isEmptyCell || cellTrimmed.length === 0) continue;
            }
            validEntries.push({ item: itemObj, origIndex: i });
        }
        if (validEntries.length === 0) return [];

        // 1. 各ユニットのセル座標 (row, col) を決定
        var numItems = validEntries.length;
        var numCols = 1;
        var numRows = numItems;

        if (isCsvFormat && csvSplitMode === "cell") {
            numCols = csvDetectedCols > 0 ? csvDetectedCols : Math.max(parseInt(settings.gridColumns, 10) || 1, 1);
            numRows = csvDetectedRows > 0 ? csvDetectedRows : Math.max(Math.ceil(items.length / numCols), 1);
            for (var cellIdx = 0; cellIdx < numItems; cellIdx++) {
                var cEntry = validEntries[cellIdx];
                cEntry.row = (cEntry.item.csvRow !== undefined) ? cEntry.item.csvRow : Math.floor(cEntry.origIndex / numCols);
                cEntry.col = (cEntry.item.csvCol !== undefined) ? cEntry.item.csvCol : (cEntry.origIndex % numCols);
                if (cEntry.row >= numRows) numRows = cEntry.row + 1;
                if (cEntry.col >= numCols) numCols = cEntry.col + 1;
            }
        } else if (layoutMode === "stack_h") {
            numCols = numItems;
            numRows = 1;
            for (var cIdx = 0; cIdx < numItems; cIdx++) {
                validEntries[cIdx].row = 0;
                validEntries[cIdx].col = cIdx;
            }
        } else if (layoutMode === "grid_col") {
            numCols = Math.max(parseInt(settings.gridColumns, 10) || 3, 1);
            numRows = Math.ceil(numItems / numCols);
            for (var gcIdx = 0; gcIdx < numItems; gcIdx++) {
                validEntries[gcIdx].row = Math.floor(gcIdx / numCols);
                validEntries[gcIdx].col = gcIdx % numCols;
            }
        } else if (layoutMode === "grid_row") {
            numRows = Math.max(parseInt(settings.gridRows, 10) || 2, 1);
            numCols = Math.ceil(numItems / numRows);
            for (var grIdx = 0; grIdx < numItems; grIdx++) {
                validEntries[grIdx].col = Math.floor(grIdx / numRows);
                validEntries[grIdx].row = grIdx % numRows;
            }
        } else {
            // stack_v
            numCols = 1;
            numRows = numItems;
            for (var svIdx = 0; svIdx < numItems; svIdx++) {
                validEntries[svIdx].row = svIdx;
                validEntries[svIdx].col = 0;
            }
        }

        var createdObjects = [];
        var tagPrefix = isPreview ? "PlaceText_Preview_" : "PlaceText_";

        // 2. まず各フレームを初期位置に生成し、幾何寸法（width, height）を測定
        var colMaxWidths = [];
        var rowMaxHeights = [];
        for (var c = 0; c < numCols; c++) colMaxWidths[c] = 0;
        for (var r = 0; r < numRows; r++) rowMaxHeights[r] = 0;

        for (var v = 0; v < validEntries.length; v++) {
            var entry = validEntries[v];
            var it = entry.item;
            var isItemVert = (it.orientation === "vertical") || (!it.orientation && isGlobalVertical);

            var finalText = (typeof PlaceTextParser !== "undefined" && PlaceTextParser.cleanUnitTextForCreation)
                ? PlaceTextParser.cleanUnitTextForCreation(it.text, settings)
                : it.text;

            var frame = null;

            if (it.type === "area") {
                var fontSize = it.size || PlaceTextConfig.toPt(settings.areaSize || 10, settings.areaSizeUnit || "pt");
                var lineLen = it.lineLength || it.width || PlaceTextConfig.toPt(settings.areaLineLength || settings.areaWidth || 300, settings.areaLineLengthUnit || settings.areaWidthUnit || "pt");

                var charsPerLine = Math.max(Math.floor(lineLen / fontSize), 1);
                var rawLines = finalText.split("\n");
                var estLines = 0;
                for (var k = 0; k < rawLines.length; k++) {
                    estLines += Math.max(Math.ceil(rawLines[k].length / charsPerLine), 1);
                }

                var physExtent = 0;
                var cntVal = (it.lineCountVal !== undefined) ? it.lineCountVal : (it.heightVal || 0);
                var cntUnit = it.lineCountUnit || "行";

                if (cntVal && cntVal > 0) {
                    if (cntUnit === "行") {
                        physExtent = cntVal * (fontSize * 1.75) + 10;
                    } else {
                        physExtent = PlaceTextConfig.toPt(cntVal, cntUnit);
                    }
                } else {
                    physExtent = Math.max(estLines * fontSize * 1.8 + 20, 50);
                }

                var rectW = isItemVert ? physExtent : lineLen;
                var rectH = isItemVert ? lineLen : physExtent;

                var rect = targetLayer.pathItems.rectangle(baseY, baseX, rectW, rectH);
                frame = targetLayer.textFrames.areaText(rect);

                if (isItemVert) {
                    try { frame.orientation = TextOrientation.VERTICAL; } catch (e) {}
                }

                frame.contents = finalText;

                var aFont = it.font || settings.areaFont;
                applyFontSafe(frame, aFont);

                var vJust = it.verticalJustification || settings.areaVerticalJustification || "top";
                applyVerticalJustificationSafe(frame, vJust);

            } else {
                // ポイント文字
                if (isItemVert) {
                    try {
                        frame = targetLayer.textFrames.pointText([baseX, baseY], TextOrientation.VERTICAL);
                    } catch (e) {
                        frame = targetLayer.textFrames.add();
                        frame.position = [baseX, baseY];
                        try { frame.orientation = TextOrientation.VERTICAL; } catch (_) {}
                    }
                } else {
                    frame = targetLayer.textFrames.add();
                    frame.position = [baseX, baseY];
                }

                frame.contents = finalText;

                var pFont = it.font || settings.pointFont;
                applyFontSafe(frame, pFont);
            }

            frame.name = tagPrefix + entry.origIndex;

            try {
                if (it.size && it.size > 0) {
                    frame.textRange.characterAttributes.size = it.size;
                }
            } catch (e) {}

            try {
                var p = frame.textRange.paragraphAttributes;
                var fSize = it.size || 12;
                if (settings.formatType === "md" && settings.mdListSymbol === "convert_list" && /(?:^|\n)[\t \u3000]*\u30FB/.test(finalText)) {
                    p.leftIndent = fSize;
                    p.firstLineIndent = -fSize;
                } else {
                    p.firstLineIndent = 0;
                    p.leftIndent = 0;
                }
                p.rightIndent = 0;
                p.spaceBefore = 0;
                p.spaceAfter = 0;
            } catch (e) {}

            var just = it.justification || (it.type === "area" ? settings.areaJustification : settings.pointJustification) || "left";
            applyJustificationSafe(frame, just);

            entry.frame = frame;
            createdObjects.push(frame);

            // 寸法測定
            var fw = (it.type === "area") ? rectW : 100;
            var fh = (it.type === "area") ? rectH : 30;
            try {
                var gb = frame.geometricBounds; // [left, top, right, bottom]
                fw = Math.abs(gb[2] - gb[0]);
                fh = Math.abs(gb[1] - gb[3]);
            } catch (e) {}

            var curCol = entry.col;
            var curRow = entry.row;
            if (fw > colMaxWidths[curCol]) colMaxWidths[curCol] = fw;
            if (fh > rowMaxHeights[curRow]) rowMaxHeights[curRow] = fh;
        }

        // 3. 各行・列のオフセットを累積計算
        var colOffsetsX = [0];
        for (var ci = 1; ci < numCols; ci++) {
            colOffsetsX[ci] = colOffsetsX[ci - 1] + colMaxWidths[ci - 1] + colSpacing;
        }

        var rowOffsetsY = [0];
        for (var ri = 1; ri < numRows; ri++) {
            rowOffsetsY[ri] = rowOffsetsY[ri - 1] + rowMaxHeights[ri - 1] + rowSpacing;
        }

        // 4. 各フレームをグリッド位置へ再配置
        for (var u = 0; u < validEntries.length; u++) {
            var ent = validEntries[u];
            var fr = ent.frame;
            var cIdx2 = ent.col;
            var rIdx2 = ent.row;

            var targetX = 0;
            var targetY = 0;

            if (isGlobalVertical) {
                // 縦書き基準: 列は右から左へ、行は上から下へ
                targetX = baseX - colOffsetsX[cIdx2];
                targetY = baseY - rowOffsetsY[rIdx2];
            } else {
                // 横書き基準: 列は左から右へ、行は上から下へ
                targetX = baseX + colOffsetsX[cIdx2];
                targetY = baseY - rowOffsetsY[rIdx2];
            }

            try {
                var curBounds = fr.geometricBounds;
                var curLeft = curBounds[0];
                var curTop = curBounds[1];
                var deltaX = targetX - curLeft;
                var deltaY = targetY - curTop;
                fr.translate(deltaX, deltaY);
            } catch (e) {
                try {
                    fr.position = [targetX, targetY];
                } catch (_) {}
            }
        }

        return createdObjects;
    }

    /**
     * 選択テキストオブジェクト群の内容を安全にインプレース更新する
     */
    function updateSelectedFrames(frames, items, settings) {
        if (!frames || !items) return [];
        var updated = [];
        for (var i = 0; i < frames.length; i++) {
            var fr = frames[i];
            if (i >= items.length) break;
            var item = items[i];

            if (item.isDeleted) {
                try { fr.remove(); } catch (e) {}
                continue;
            }

            var finalText = (typeof PlaceTextParser !== "undefined" && PlaceTextParser.cleanUnitTextForCreation)
                ? PlaceTextParser.cleanUnitTextForCreation(item.text, settings)
                : item.text;

            try {
                fr.contents = finalText;
                if (item.size && item.size > 0) {
                    fr.textRange.characterAttributes.size = item.size;
                }
                if (item.font) {
                    applyFontSafe(fr, item.font);
                }
                var just = item.justification || (item.type === "area" ? settings.areaJustification : settings.pointJustification) || "left";
                applyJustificationSafe(fr, just);

                if (item.type === "area") {
                    var vJust = item.verticalJustification || settings.areaVerticalJustification || "top";
                    applyVerticalJustificationSafe(fr, vJust);
                }
                updated.push(fr);
            } catch (e) {}
        }
        return updated;
    }

    return {
        getTargetLayer: getTargetLayer,
        getBasePosition: getBasePosition,
        createStackLayout: createStackLayout,
        updateSelectedFrames: updateSelectedFrames,
        applyJustificationSafe: applyJustificationSafe,
        applyVerticalJustificationSafe: applyVerticalJustificationSafe,
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
            ? "テキストファイル (*.txt;*.md;*.markdown;*.csv;*.tsv):*.txt;*.md;*.markdown;*.csv;*.tsv,すべてのファイル (*.*):*.*"
            : function (f) {
                if (f instanceof Folder) return true;
                var ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
                return (ext === ".txt" || ext === ".md" || ext === ".markdown" || ext === ".csv" || ext === ".tsv");
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

        // ユニットメタデータ管理ステート
        var blockItems = [];
        var selectedBlockIndex = -1;
        var isUpdatingInspector = false;
        var isInputDirty = false;
        var isSelectionMode = false;
        var selectionSourceFrames = [];

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
        // 【タブ1】 編集タブ
        // =========================================================
        var tabEditor = tabbedPanel.add("tab", undefined, "編集タブ");
        tabEditor.orientation = "row";
        tabEditor.alignChildren = ["fill", "fill"];
        tabEditor.spacing = 15;
        tabEditor.margins = 10;

        // --- 左ペイン ---
        var leftPane = tabEditor.add("group");
        leftPane.orientation = "column";
        leftPane.alignChildren = "fill";
        leftPane.spacing = 8;
        leftPane.preferredSize = [440, 550];

        // フレーム: ソース選択
        var sourcePanel = leftPane.add("panel", undefined, "ソース選択");
        sourcePanel.orientation = "column";
        sourcePanel.alignChildren = "fill";
        sourcePanel.spacing = 5;
        sourcePanel.margins = [10, 12, 10, 8];

        // 1. Row ソース選択のボタン
        var fileBtnGroup = sourcePanel.add("group");
        fileBtnGroup.orientation = "row";
        fileBtnGroup.alignChildren = ["left", "center"];
        fileBtnGroup.spacing = 6;

        var loadFileBtn = fileBtnGroup.add("button", undefined, "ファイル読込");
        loadFileBtn.preferredSize = [95, 24];
        loadFileBtn.helpTip = "外部ファイル (TXT / MD / CSV) を読み込み、ユニット一覧へ自動展開します";

        var directInputBtn = fileBtnGroup.add("button", undefined, "直接入力");
        directInputBtn.preferredSize = [85, 24];
        directInputBtn.helpTip = "テキストボックスへの直接入力モードに切り替えます";

        var loadSelectionBtn = fileBtnGroup.add("button", undefined, "選択オブジェクト");
        loadSelectionBtn.preferredSize = [115, 24];
        loadSelectionBtn.helpTip = "Illustratorドキュメントで選択されているテキストオブジェクトから取得します";

        // 2. Row 選択したソースを表示する
        var sourceRow = sourcePanel.add("group");
        sourceRow.orientation = "row";
        sourceRow.alignChildren = ["left", "center"];
        sourceRow.spacing = 2;
        var lblSourcePrefix = sourceRow.add("statictext", undefined, "ソース : ");
        lblSourcePrefix.graphics.foregroundColor = lblSourcePrefix.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.35, 0.35, 0.35, 1], 1);
        var lblCurrentSource = sourceRow.add("statictext", undefined, "選択されていません");
        lblCurrentSource.preferredSize = [340, 18];
        lblCurrentSource.graphics.foregroundColor = lblCurrentSource.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.35, 0.35, 0.35, 1], 1);

        // 3. Row ソースが選択オブジェクトの場合のみ表示
        var selectionWarnRow = sourcePanel.add("group");
        selectionWarnRow.orientation = "row";
        selectionWarnRow.alignChildren = ["left", "center"];
        selectionWarnRow.spacing = 0;
        var lblSelectionWarn = selectionWarnRow.add("statictext", undefined, "テキストオブジェクトの削除、文面の変更のみが可能です。");
        lblSelectionWarn.graphics.foregroundColor = lblSelectionWarn.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.85, 0.15, 0.15, 1], 1);
        selectionWarnRow.visible = false;
        selectionWarnRow.maximumSize = [0, 0];
        selectionWarnRow.preferredSize = [0, 0];

        function setSelectionModeUI(isSelMode) {
            isSelectionMode = !!isSelMode;
            if (isSelectionMode) {
                selectionWarnRow.maximumSize = [420, 22];
                selectionWarnRow.preferredSize = [420, 18];
                selectionWarnRow.visible = true;
            } else {
                selectionWarnRow.visible = false;
                selectionWarnRow.maximumSize = [0, 0];
                selectionWarnRow.preferredSize = [0, 0];
            }
            if (typeof btnLayoutSettings !== "undefined" && btnLayoutSettings) {
                btnLayoutSettings.enabled = !isSelectionMode;
            }
            try {
                sourcePanel.layout.layout(true);
                leftPane.layout.layout(true);
            } catch (e) {}
        }

        // フレーム: テキスト編集
        var textEditPanel = leftPane.add("panel", undefined, "テキスト編集");
        textEditPanel.orientation = "column";
        textEditPanel.alignChildren = "fill";
        textEditPanel.spacing = 5;
        textEditPanel.margins = [10, 12, 10, 8];

        // 1. Row UndoとRedo
        var undoRedoRow = textEditPanel.add("group");
        undoRedoRow.orientation = "row";
        undoRedoRow.alignChildren = ["left", "center"];
        undoRedoRow.spacing = 6;

        var btnUndo = undoRedoRow.add("button", undefined, "元に戻す");
        btnUndo.preferredSize = [80, 24];
        btnUndo.helpTip = "直前のテキスト編集を元に戻す";
        btnUndo.enabled = false;

        var btnRedo = undoRedoRow.add("button", undefined, "やり直す");
        btnRedo.preferredSize = [80, 24];
        btnRedo.helpTip = "元に戻したテキスト編集をやり直す";
        btnRedo.enabled = false;

        // 2. Row 制御文字の操作
        var ctrlCharRow = textEditPanel.add("group");
        ctrlCharRow.orientation = "row";
        ctrlCharRow.alignChildren = ["left", "center"];
        ctrlCharRow.spacing = 6;

        var btnInsertTab = ctrlCharRow.add("button", undefined, "Tab挿入");
        btnInsertTab.preferredSize = [80, 24];
        btnInsertTab.helpTip = "編集中のテキスト欄のカーソル位置にタブ文字 (\\t) を挿入";

        var isEscapedMode = false;
        var btnEscapeChars = ctrlCharRow.add("button", undefined, "制御文字を表示/非表示");
        btnEscapeChars.preferredSize = [165, 24];
        btnEscapeChars.helpTip = "制御文字 (タブ \\t 等) をエスケープ文字列として表示／非表示を切り替え";

        // モデル文字列（プレースホルダー）定義
        var PLACEHOLDER_TEXT = "見出しテキスト\r\n\r\nここは本文の段落です。指定した文字数（初期値30文字）以上のユニットは自動的にエリア内文字として判定され、指定幅で折り返し配置されます。\r\n各ユニットの種別やサイズは、右側のユニット一覧から個別に変更できます。";

        var isPlaceholder = true;

        // 3. テキストボックス
        var inputBox = textEditPanel.add("edittext", undefined, PLACEHOLDER_TEXT, {
            multiline: true,
            scrolling: true
        });
        inputBox.preferredSize = [415, 340];

        function showPlaceholder() {
            inputBox.text = PLACEHOLDER_TEXT;
            isPlaceholder = true;
            isInputDirty = false;
            if (!isSelectionMode) {
                lblCurrentSource.text = "選択されていません";
            }
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
            var t = inputBox.text;
            if (isEscapedMode) {
                t = PlaceTextParser.unescapeControlChars(t);
            }
            return t;
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

        // 4. Row 自動ユニット分割、属性振り分け
        var splitRow = textEditPanel.add("group");
        splitRow.orientation = "row";
        splitRow.alignChildren = ["left", "center"];
        splitRow.spacing = 6;

        splitRow.add("statictext", undefined, "形式 :");
        var dropEditorFormat = splitRow.add("dropdownlist", undefined, [
            "TXT(プレーンテキスト)",
            "Markdown",
            "CSV・TSV"
        ]);
        dropEditorFormat.preferredSize = [135, 24];
        var initEdFmtIdx = 1; // Markdown default
        if (settings.formatType === "txt") initEdFmtIdx = 0;
        else if (settings.formatType === "csv") initEdFmtIdx = 2;
        dropEditorFormat.selection = initEdFmtIdx;

        var splitBtn = splitRow.add("button", undefined, "自動テキスト分割・属性判定");
        splitBtn.preferredSize = [220, 24];

        // --- 右ペイン ---
        var rightPaneEditor = tabEditor.add("group");
        rightPaneEditor.orientation = "column";
        rightPaneEditor.alignChildren = "fill";
        rightPaneEditor.spacing = 8;
        rightPaneEditor.preferredSize = [450, 550];

        // フレーム: ユニット属性の編集
        var unitListPanel = rightPaneEditor.add("panel", undefined, "ユニット属性の編集");
        unitListPanel.orientation = "column";
        unitListPanel.alignChildren = "fill";
        unitListPanel.spacing = 5;
        unitListPanel.margins = [10, 12, 10, 8];

        // 1. Row 一括変更
        var batchChangeRow = unitListPanel.add("group");
        batchChangeRow.orientation = "row";
        batchChangeRow.alignChildren = ["left", "center"];
        batchChangeRow.spacing = 6;

        var btnToggleSelectAll = batchChangeRow.add("button", undefined, "すべて選択/すべて解除");
        btnToggleSelectAll.preferredSize = [140, 22];
        btnToggleSelectAll.helpTip = "全ユニットの選択／選択解除を切り替えます";

        var btnAllPoint = batchChangeRow.add("button", undefined, "すべてポイント文字");
        btnAllPoint.preferredSize = [130, 22];
        btnAllPoint.helpTip = "チェックされているユニット（未選択時は全ユニット）をポイント文字に一括変更します";

        var btnAllArea = batchChangeRow.add("button", undefined, "すべてエリア内文字");
        btnAllArea.preferredSize = [130, 22];
        btnAllArea.helpTip = "チェックされているユニット（未選択時は全ユニット）をエリア内文字に一括変更します";

        // 2. リストボックス ユニット一覧
        var blockList = unitListPanel.add("listbox", undefined, [], {
            numberOfColumns: 5,
            showHeaders: true,
            columnTitles: ["select", "No.", "タイプ", "文字サイズ/エリア幅/高さ", "プレビュー"],
            columnWidths: [45, 30, 62, 135, 145]
        });
        blockList.preferredSize = [430, 235];

        // 3. Row ユニット単位の変更
        var listActionRow = unitListPanel.add("group");
        listActionRow.orientation = "row";
        listActionRow.alignChildren = ["left", "center"];
        listActionRow.spacing = 6;

        var btnRemoveBlock = listActionRow.add("button", undefined, "選択したユニットを削除");
        btnRemoveBlock.preferredSize = [145, 22];
        var btnMergeUp = listActionRow.add("button", undefined, "上に結合");
        btnMergeUp.preferredSize = [80, 22];
        var btnMoveUp = listActionRow.add("button", undefined, "上へ移動");
        btnMoveUp.preferredSize = [80, 22];
        var btnMoveDown = listActionRow.add("button", undefined, "下へ移動");
        btnMoveDown.preferredSize = [80, 22];

        // フレーム: 選択ユニットの編集 (4行レイアウト)
        var inspectorBox = rightPaneEditor.add("panel", undefined, "選択ユニットの編集");
        inspectorBox.orientation = "column";
        inspectorBox.alignChildren = "fill";
        inspectorBox.spacing = 4;
        inspectorBox.margins = [10, 12, 10, 8];
        inspectorBox.preferredSize = [430, 215];

        // 1. Row 種類と組み方向
        var metaRow1 = inspectorBox.add("group");
        metaRow1.orientation = "row";
        metaRow1.alignChildren = ["left", "center"];
        metaRow1.spacing = 6;

        var grpType = metaRow1.add("group");
        grpType.orientation = "row";
        grpType.alignChildren = ["left", "center"];
        grpType.spacing = 4;
        grpType.add("statictext", undefined, "種類 : ");
        var radTypePoint = grpType.add("radiobutton", undefined, "ポイント文字");
        var radTypeArea = grpType.add("radiobutton", undefined, "エリア内文字");
        radTypePoint.value = true;

        var grpOrient = metaRow1.add("group");
        grpOrient.orientation = "row";
        grpOrient.alignChildren = ["left", "center"];
        grpOrient.spacing = 4;
        grpOrient.add("statictext", undefined, "  組み方向 : ");
        var radOrientH = grpOrient.add("radiobutton", undefined, "横書き");
        var radOrientV = grpOrient.add("radiobutton", undefined, "縦書き");
        radOrientH.value = true;

        // 2. Row フォントサイズと文字揃え
        var metaRow2 = inspectorBox.add("group");
        metaRow2.orientation = "row";
        metaRow2.alignChildren = ["left", "center"];
        metaRow2.spacing = 4;

        metaRow2.add("statictext", undefined, "文字サイズ : ");
        var editBlockSize = metaRow2.add("edittext", undefined, "");
        editBlockSize.characters = 4;
        editBlockSize.justify = "right";
        var dropBlockSizeUnit = metaRow2.add("dropdownlist", undefined, ["pt", "mm", "px"]);
        dropBlockSizeUnit.preferredSize = [55, 22];
        dropBlockSizeUnit.selection = 0;

        var lblBlockJust = metaRow2.add("statictext", undefined, "  文字揃え : ");
        var dropBlockJust = metaRow2.add("dropdownlist", undefined, ["左揃え", "中央揃え", "右揃え", "均等割付"]);
        dropBlockJust.preferredSize = [115, 22];
        dropBlockJust.selection = 0;

        // 3. Row エリア組版設定 : ポイント文字選択時は行全体をグレーアウト
        var metaRow3 = inspectorBox.add("group");
        metaRow3.orientation = "row";
        metaRow3.alignChildren = ["left", "center"];
        metaRow3.spacing = 3;

        var lblLineLength = metaRow3.add("statictext", undefined, "行長 : ");
        var editLineLength = metaRow3.add("edittext", undefined, "");
        editLineLength.characters = 4;
        editLineLength.justify = "right";
        var dropLineLengthUnit = metaRow3.add("dropdownlist", undefined, ["pt", "mm", "px"]);
        dropLineLengthUnit.preferredSize = [50, 22];
        dropLineLengthUnit.selection = 0;

        var lblLineCount = metaRow3.add("statictext", undefined, "  行数 : ");
        var editLineCount = metaRow3.add("edittext", undefined, "");
        editLineCount.characters = 3;
        editLineCount.justify = "right";
        var dropLineCountUnit = metaRow3.add("dropdownlist", undefined, ["行", "pt", "mm", "px"]);
        dropLineCountUnit.preferredSize = [50, 22];
        dropLineCountUnit.selection = 0;

        var lblBlockVJust = metaRow3.add("statictext", undefined, "  行配置 : ");
        var dropBlockVJust = metaRow3.add("dropdownlist", undefined, ["上揃え", "中央揃え", "下揃え", "均等配置"]);
        dropBlockVJust.preferredSize = [105, 22];
        dropBlockVJust.selection = 0;

        /**
         * 組み方向に応じた文字揃え・行配置ドロップダウンのラベル動的切り替え
         * @param {string|boolean} orientMode - "horizontal" | "vertical" | "mixed" (または boolean isVertical)
         */
        function updateAlignmentDropdownLabels(orientMode) {
            var mode = orientMode;
            if (typeof orientMode === "boolean") {
                mode = orientMode ? "vertical" : "horizontal";
            }

            var justIdx = dropBlockJust.selection ? dropBlockJust.selection.index : 0;
            var vJustIdx = dropBlockVJust.selection ? dropBlockVJust.selection.index : 0;

            dropBlockJust.removeAll();
            if (mode === "vertical") {
                dropBlockJust.add("item", "上揃え");
                dropBlockJust.add("item", "中央揃え");
                dropBlockJust.add("item", "下揃え");
                dropBlockJust.add("item", "均等割付");
            } else if (mode === "mixed") {
                dropBlockJust.add("item", "左揃え(上揃え)");
                dropBlockJust.add("item", "中央揃え");
                dropBlockJust.add("item", "右揃え(下揃え)");
                dropBlockJust.add("item", "均等割付");
            } else {
                dropBlockJust.add("item", "左揃え");
                dropBlockJust.add("item", "中央揃え");
                dropBlockJust.add("item", "右揃え");
                dropBlockJust.add("item", "均等割付");
            }
            dropBlockJust.selection = (justIdx >= 0 && justIdx < 4) ? justIdx : 0;

            dropBlockVJust.removeAll();
            if (mode === "vertical") {
                dropBlockVJust.add("item", "右揃え");
                dropBlockVJust.add("item", "中央揃え");
                dropBlockVJust.add("item", "左揃え");
                dropBlockVJust.add("item", "均等配置");
            } else if (mode === "mixed") {
                dropBlockVJust.add("item", "上揃え(右揃え)");
                dropBlockVJust.add("item", "中央揃え");
                dropBlockVJust.add("item", "下揃え(左揃え)");
                dropBlockVJust.add("item", "均等配置");
            } else {
                dropBlockVJust.add("item", "上揃え");
                dropBlockVJust.add("item", "中央揃え");
                dropBlockVJust.add("item", "下揃え");
                dropBlockVJust.add("item", "均等配置");
            }
            dropBlockVJust.selection = (vJustIdx >= 0 && vJustIdx < 4) ? vJustIdx : 0;
        }

        // 4. Row 本文編集
        var metaRow4 = inspectorBox.add("group");
        metaRow4.orientation = "row";
        metaRow4.alignChildren = ["left", "top"];
        metaRow4.spacing = 6;
        var lblBlockText = metaRow4.add("statictext", undefined, "本文 : ");
        lblBlockText.preferredSize = [42, 20];
        var editBlockText = metaRow4.add("edittext", undefined, "", {
            multiline: true,
            scrolling: true
        });
        editBlockText.preferredSize = [355, 52];
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
        // 【タブ2】 標準設定タブ
        // =========================================================
        var tabSettings = tabbedPanel.add("tab", undefined, "標準設定タブ");
        tabSettings.orientation = "row";
        tabSettings.alignChildren = ["fill", "fill"];
        tabSettings.spacing = 15;
        tabSettings.margins = 10;

        var leftSettingsCol = tabSettings.add("group");
        leftSettingsCol.orientation = "column";
        leftSettingsCol.alignChildren = "fill";
        leftSettingsCol.spacing = 6;
        leftSettingsCol.preferredSize = [445, 550];

        var rightSettingsCol = tabSettings.add("group");
        rightSettingsCol.orientation = "column";
        rightSettingsCol.alignChildren = "fill";
        rightSettingsCol.spacing = 8;
        rightSettingsCol.preferredSize = [445, 550];

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
            "YuGothic-Medium"
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

        var FONT_ITEMS = FONT_PRESETS.slice(0);
        FONT_ITEMS.push("自由入力");

        function createFontSettingRow(parentPanel, labelText, defaultFont, onChangeCallback) {
            var row = parentPanel.add("group");
            row.orientation = "row";
            row.alignChildren = ["left", "center"];
            row.spacing = 4;

            var lbl = row.add("statictext", undefined, labelText);
            lbl.preferredSize = [68, 20];

            var dropFont = row.add("dropdownlist", undefined, FONT_ITEMS);
            dropFont.preferredSize = [155, 22];

            var customFontInput = row.add("edittext", undefined, "");
            customFontInput.preferredSize = [120, 22];
            customFontInput.enabled = false;

            var customItemIdx = dropFont.items.length - 1;
            var initialFont = defaultFont || "";
            var initIdx = 0;
            if (initialFont !== "" && initialFont !== "デフォルト" && initialFont !== "未指定") {
                var found = false;
                for (var i = 1; i < customItemIdx; i++) {
                    if (dropFont.items[i].text === initialFont) {
                        initIdx = i;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    initIdx = customItemIdx;
                    customFontInput.text = initialFont;
                    customFontInput.enabled = true;
                }
            }
            try {
                dropFont.selection = initIdx;
            } catch (e) {}

            dropFont.onChange = function () {
                var isCustom = (dropFont.selection && dropFont.selection.text === "自由入力");
                customFontInput.enabled = isCustom;
                if (!isCustom) {
                    customFontInput.text = (dropFont.selection && dropFont.selection.index > 0) ? dropFont.selection.text : "";
                } else {
                    customFontInput.active = true;
                }
                if (typeof onChangeCallback === "function") {
                    onChangeCallback();
                }
            };

            customFontInput.onChanging = function () {
                if (typeof onChangeCallback === "function") {
                    onChangeCallback();
                }
            };

            var btnSearch = row.add("button", undefined, "検索");
            btnSearch.preferredSize = [50, 22];
            btnSearch.helpTip = "Illustratorにインストールされているフォントを検索ダイアログから選択します";

            btnSearch.onClick = function () {
                var curText = "";
                if (dropFont.selection) {
                    if (dropFont.selection.text === "自由入力") {
                        curText = customFontInput.text;
                    } else if (dropFont.selection.index > 0) {
                        curText = dropFont.selection.text;
                    }
                }
                showFontSearchDialog(curText, function (psName, displayName) {
                    var matchIdx = -1;
                    for (var k = 1; k < dropFont.items.length; k++) {
                        if (dropFont.items[k].text === psName) {
                            matchIdx = k;
                            break;
                        }
                    }
                    if (matchIdx !== -1 && dropFont.items[matchIdx].text !== "自由入力") {
                        dropFont.selection = matchIdx;
                        customFontInput.enabled = false;
                        customFontInput.text = psName;
                    } else {
                        for (var m = 0; m < dropFont.items.length; m++) {
                            if (dropFont.items[m].text === "自由入力") {
                                dropFont.selection = m;
                                break;
                            }
                        }
                        customFontInput.enabled = true;
                        customFontInput.text = psName;
                    }
                    if (typeof onChangeCallback === "function") {
                        onChangeCallback();
                    }
                    if (typeof statusText !== "undefined" && statusText) {
                        statusText.text = "ステータス : フォント選択 (" + displayName + " [" + psName + "])";
                    }
                });
            };

            return {
                getFont: function () {
                    if (!dropFont.selection || dropFont.selection.index === 0) return "";
                    var selText = dropFont.selection.text;
                    if (selText === "自由入力") {
                        return (customFontInput.text || "").replace(/^\s+|\s+$/g, "");
                    }
                    if (selText.indexOf("デフォルト") !== -1 || selText.indexOf("未指定") !== -1) return "";
                    return selText;
                },
                setFont: function (fontName) {
                    if (!fontName || fontName === "デフォルト" || fontName === "未指定") {
                        dropFont.selection = 0;
                        customFontInput.text = "";
                        customFontInput.enabled = false;
                        return;
                    }
                    for (var j = 1; j < dropFont.items.length; j++) {
                        if (dropFont.items[j].text === fontName && dropFont.items[j].text !== "自由入力") {
                            dropFont.selection = j;
                            customFontInput.text = fontName;
                            customFontInput.enabled = false;
                            return;
                        }
                    }
                    for (var c = 0; c < dropFont.items.length; c++) {
                        if (dropFont.items[c].text === "自由入力") {
                            dropFont.selection = c;
                            break;
                        }
                    }
                    customFontInput.text = fontName;
                    customFontInput.enabled = true;
                },
                dropFont: dropFont,
                customFontInput: customFontInput
            };
        }

        // =========================================================
        // 【左列設定パネル】
        // =========================================================

        // --- フレーム1: 自動分割の基準 ---
        var splitRuleBox = leftSettingsCol.add("panel", undefined, "自動分割の基準");
        splitRuleBox.orientation = "column";
        splitRuleBox.alignChildren = "fill";
        splitRuleBox.spacing = 5;
        splitRuleBox.margins = [10, 12, 10, 8];

        // 1. Row 検索方法 (ラジオボタン OR検索 / AND検索)
        var condRow = splitRuleBox.add("group");
        condRow.orientation = "row";
        condRow.alignChildren = ["left", "center"];
        condRow.spacing = 12;
        var radBoundaryOr = condRow.add("radiobutton", undefined, "OR検索");
        var radBoundaryAnd = condRow.add("radiobutton", undefined, "AND検索");
        if (settings.boundaryMode === "and") {
            radBoundaryOr.value = false;
            radBoundaryAnd.value = true;
        } else {
            radBoundaryOr.value = true;
            radBoundaryAnd.value = false;
        }

        // 2. Row 検索対象A-1 : 特定のマーカー
        var markerRow = splitRuleBox.add("group");
        markerRow.orientation = "row";
        markerRow.alignChildren = ["left", "center"];
        markerRow.spacing = 6;
        var chkMarker = markerRow.add("checkbox", undefined, "特定のマーカー");
        chkMarker.value = (settings.useBoundaryMarker === true);

        var MARKER_PRESETS = ["---", "===", "***", "入力したマーカー"];
        var dropMarker = markerRow.add("dropdownlist", undefined, MARKER_PRESETS);
        dropMarker.preferredSize = [135, 22];

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
        customMarkerInput.characters = 8;
        customMarkerInput.enabled = (dropMarker.selection && dropMarker.selection.text === "入力したマーカー");

        // 3. Row 入力したマーカーの使用可否表示行
        var markerStatusRow = splitRuleBox.add("group");
        markerStatusRow.margins = [20, 0, 0, 0];
        var markerStatusLbl = markerStatusRow.add("statictext", undefined, "使用可能(テキスト本文との衝突は保証しません)");
        markerStatusLbl.preferredSize = [380, 18];
        markerStatusLbl.graphics.foregroundColor = markerStatusLbl.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.2, 0.5, 0.2, 1], 1);

        function validateMarkerUI() {
            if (!chkMarker.value) {
                markerStatusLbl.text = "";
                markerStatusRow.visible = false;
                return;
            }
            markerStatusRow.visible = true;
            var selText = dropMarker.selection ? dropMarker.selection.text : "";
            var mkr = (selText === "入力したマーカー") ? customMarkerInput.text : (selText || "---");
            var res = PlaceTextParser.validateBoundaryMarker(mkr);
            if (res.valid) {
                markerStatusLbl.text = "使用可能(テキスト本文との衝突は保証しません)";
                markerStatusLbl.graphics.foregroundColor = markerStatusLbl.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.2, 0.5, 0.2, 1], 1);
            } else {
                markerStatusLbl.text = "使用不可。" + res.message;
                markerStatusLbl.graphics.foregroundColor = markerStatusLbl.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.8, 0.2, 0.2, 1], 1);
            }
        }

        dropMarker.onChange = function () {
            if (!dropMarker.selection) return;
            var selText = dropMarker.selection.text;
            if (selText === "入力したマーカー") {
                customMarkerInput.enabled = chkMarker.value;
                if (customMarkerInput.enabled) customMarkerInput.active = true;
            } else {
                customMarkerInput.enabled = false;
                customMarkerInput.text = selText;
            }
            validateMarkerUI();
        };

        customMarkerInput.onChanging = function () {
            validateMarkerUI();
        };

        // 4. Row 検索条件A-2 : 空行の数
        var rowBlankLines = splitRuleBox.add("group");
        rowBlankLines.orientation = "row";
        rowBlankLines.alignChildren = ["left", "center"];
        rowBlankLines.spacing = 6;
        var chkBlankLines = rowBlankLines.add("checkbox", undefined, "空行の数");
        chkBlankLines.value = (settings.useBlankLines !== false);
        var blankLinesInput = rowBlankLines.add("edittext", undefined, String(settings.blankLinesCount || 1));
        blankLinesInput.characters = 3;
        blankLinesInput.justify = "right";
        rowBlankLines.add("statictext", undefined, "行以上の連続する空行でユニットを分割");

        // 5. Row 検索条件B 形式ごとの分割
        var rowMarkdown = splitRuleBox.add("group");
        rowMarkdown.orientation = "row";
        rowMarkdown.alignChildren = ["left", "center"];
        rowMarkdown.spacing = 6;
        var chkMarkdownHeaders = rowMarkdown.add("checkbox", undefined, "テキストの形式に基づく分割");
        chkMarkdownHeaders.value = (settings.useFormatSplit !== undefined) ? (settings.useFormatSplit !== false) : (settings.useMarkdownHeaders !== false);
        var lblMarkdownNote = rowMarkdown.add("statictext", undefined, "詳細は[解釈形式ごとの設定]で設定してください。");
        lblMarkdownNote.graphics.foregroundColor = lblMarkdownNote.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.4, 0.4, 0.4, 1], 1);

        // --- フレーム2: 属性判定 ---
        var typeRuleBox = leftSettingsCol.add("panel", undefined, "属性判定");
        typeRuleBox.orientation = "column";
        typeRuleBox.alignChildren = "fill";
        typeRuleBox.spacing = 5;
        typeRuleBox.margins = [10, 12, 10, 8];

        // 1. Row 判定モード
        var rowDetectMode = typeRuleBox.add("group");
        rowDetectMode.orientation = "row";
        rowDetectMode.alignChildren = ["left", "center"];
        rowDetectMode.spacing = 6;
        rowDetectMode.add("statictext", undefined, "判定モード : ");
        var dropDetectMode = rowDetectMode.add("dropdownlist", undefined, [
            "自動判定",
            "すべてポイント文字",
            "すべてエリア内文字"
        ]);
        dropDetectMode.preferredSize = [200, 22];
        if (settings.detectMode === "all_point") {
            dropDetectMode.selection = 1;
        } else if (settings.detectMode === "all_area") {
            dropDetectMode.selection = 2;
        } else {
            dropDetectMode.selection = 0;
        }

        // 2. Row 文字数による判定
        var rowCharThreshold = typeRuleBox.add("group");
        rowCharThreshold.orientation = "row";
        rowCharThreshold.alignChildren = ["left", "center"];
        rowCharThreshold.spacing = 6;
        var chkCharThreshold = rowCharThreshold.add("checkbox", undefined, "文字数 : ");
        chkCharThreshold.value = (settings.useCharThreshold !== false);
        var thresholdInput = rowCharThreshold.add("edittext", undefined, String(settings.autoTagThreshold || 30));
        thresholdInput.characters = 4;
        thresholdInput.justify = "right";
        rowCharThreshold.add("statictext", undefined, "文字以上でエリア内文字と判定");

        // 3. Row マーカーによる判定
        var rowTypeMarkers = typeRuleBox.add("group");
        rowTypeMarkers.orientation = "row";
        rowTypeMarkers.alignChildren = ["left", "center"];
        rowTypeMarkers.spacing = 6;
        var chkTypeMarkers = rowTypeMarkers.add("checkbox", undefined, "先頭の [P] / [A]・(P) / (A) マーカーを認識して本文から除去");
        chkTypeMarkers.value = (settings.useTypeMarkers !== false);

        // --- フレーム3: ユニット属性ごとの設定 ---
        var unitAttrBox = leftSettingsCol.add("panel", undefined, "ユニット属性ごとの設定");
        unitAttrBox.orientation = "column";
        unitAttrBox.alignChildren = "fill";
        unitAttrBox.spacing = 3;
        unitAttrBox.margins = [10, 10, 10, 6];

        // 1. Row ポイント文字 見出しラベル
        var rowPointHeader = unitAttrBox.add("group");
        rowPointHeader.orientation = "row";
        rowPointHeader.alignChildren = ["left", "center"];
        rowPointHeader.add("statictext", undefined, "ポイント文字");

        // 2. Row ポイント文字の設定
        var rowPointAttrs = unitAttrBox.add("group");
        rowPointAttrs.orientation = "row";
        rowPointAttrs.alignChildren = ["left", "center"];
        rowPointAttrs.spacing = 2;
        rowPointAttrs.add("statictext", undefined, "文字サイズ : ");
        var pointSizeInput = rowPointAttrs.add("edittext", undefined, String(settings.pointSize || 14));
        pointSizeInput.characters = 3;
        pointSizeInput.justify = "right";
        var dropPointSizeUnit = rowPointAttrs.add("dropdownlist", undefined, ["pt", "mm", "px"]);
        dropPointSizeUnit.preferredSize = [48, 22];
        dropPointSizeUnit.selection = (settings.pointSizeUnit === "mm") ? 1 : (settings.pointSizeUnit === "px" ? 2 : 0);

        rowPointAttrs.add("statictext", undefined, " 組み方向 : ");
        var dropPointOrient = rowPointAttrs.add("dropdownlist", undefined, ["横書き", "縦書き"]);
        dropPointOrient.preferredSize = [70, 22];
        var initPOrient = settings.pointOrientation || settings.textOrientation || "horizontal";
        dropPointOrient.selection = (initPOrient === "vertical") ? 1 : 0;

        rowPointAttrs.add("statictext", undefined, " 文字揃え : ");
        var dropPointJust = rowPointAttrs.add("dropdownlist", undefined, ["左揃え", "中央揃え", "右揃え", "均等割付"]);
        dropPointJust.preferredSize = [82, 22];
        var pJustIdx = 0;
        if (settings.pointJustification === "center") pJustIdx = 1;
        else if (settings.pointJustification === "right") pJustIdx = 2;
        else if (settings.pointJustification === "justify") pJustIdx = 3;
        dropPointJust.selection = pJustIdx;

        // 3. Row ポイント文字のフォント
        var rowPFont = createFontSettingRow(unitAttrBox, "フォント : ", settings.pointFont, markSettingsDirty);

        // 4. Row エリア内文字 見出しラベル
        var rowAreaHeader = unitAttrBox.add("group");
        rowAreaHeader.orientation = "row";
        rowAreaHeader.alignChildren = ["left", "center"];
        rowAreaHeader.margins = [0, 2, 0, 0];
        rowAreaHeader.add("statictext", undefined, "エリア内文字");

        // 5. Row エリア内文字の設定1
        var rowAreaAttrs1 = unitAttrBox.add("group");
        rowAreaAttrs1.orientation = "row";
        rowAreaAttrs1.alignChildren = ["left", "center"];
        rowAreaAttrs1.spacing = 2;
        rowAreaAttrs1.add("statictext", undefined, "文字サイズ : ");
        var areaSizeInput = rowAreaAttrs1.add("edittext", undefined, String(settings.areaSize || 10));
        areaSizeInput.characters = 3;
        areaSizeInput.justify = "right";
        var dropAreaSizeUnit = rowAreaAttrs1.add("dropdownlist", undefined, ["pt", "mm", "px"]);
        dropAreaSizeUnit.preferredSize = [48, 22];
        dropAreaSizeUnit.selection = (settings.areaSizeUnit === "mm") ? 1 : (settings.areaSizeUnit === "px" ? 2 : 0);

        rowAreaAttrs1.add("statictext", undefined, " 組み方向 : ");
        var dropAreaOrient = rowAreaAttrs1.add("dropdownlist", undefined, ["横書き", "縦書き"]);
        dropAreaOrient.preferredSize = [70, 22];
        var initAOrient = settings.areaOrientation || settings.textOrientation || "horizontal";
        dropAreaOrient.selection = (initAOrient === "vertical") ? 1 : 0;

        rowAreaAttrs1.add("statictext", undefined, " 文字揃え : ");
        var dropAreaJust = rowAreaAttrs1.add("dropdownlist", undefined, ["左揃え", "中央揃え", "右揃え", "均等割付"]);
        dropAreaJust.preferredSize = [82, 22];
        var aJustIdx = 0;
        if (settings.areaJustification === "center") aJustIdx = 1;
        else if (settings.areaJustification === "right") aJustIdx = 2;
        else if (settings.areaJustification === "justify") aJustIdx = 3;
        dropAreaJust.selection = aJustIdx;

        // 6. Row エリア内文字のフォント
        var rowAFont = createFontSettingRow(unitAttrBox, "フォント : ", settings.areaFont, markSettingsDirty);

        // 7. Row エリア内文字の設定2 (行長・行数・行配置)
        var rowAreaAttrs2 = unitAttrBox.add("group");
        rowAreaAttrs2.orientation = "row";
        rowAreaAttrs2.alignChildren = ["left", "center"];
        rowAreaAttrs2.spacing = 3;
        rowAreaAttrs2.add("statictext", undefined, "行長 : ");
        var areaWidthInput = rowAreaAttrs2.add("edittext", undefined, String(settings.areaLineLength || settings.areaWidth || 300));
        areaWidthInput.characters = 3;
        areaWidthInput.justify = "right";
        var dropAreaWidthUnit = rowAreaAttrs2.add("dropdownlist", undefined, ["pt", "mm", "px"]);
        dropAreaWidthUnit.preferredSize = [48, 22];
        var awUnit = settings.areaLineLengthUnit || settings.areaWidthUnit || "pt";
        dropAreaWidthUnit.selection = (awUnit === "mm") ? 1 : (awUnit === "px" ? 2 : 0);

        rowAreaAttrs2.add("statictext", undefined, "  行数 : ");
        var initAreaCnt = (settings.areaLineCount !== undefined) ? settings.areaLineCount : (settings.areaHeight || 0);
        var areaHeightInput = rowAreaAttrs2.add("edittext", undefined, String(initAreaCnt));
        areaHeightInput.characters = 3;
        areaHeightInput.justify = "right";
        var dropAreaHeightUnit = rowAreaAttrs2.add("dropdownlist", undefined, ["行", "pt", "mm", "px"]);
        dropAreaHeightUnit.preferredSize = [48, 22];
        var ahUnit = settings.areaLineCountUnit || settings.areaHeightUnit || "行";
        var ahUnitIdx = 0;
        if (ahUnit === "pt") ahUnitIdx = 1;
        else if (ahUnit === "mm") ahUnitIdx = 2;
        else if (ahUnit === "px") ahUnitIdx = 3;
        dropAreaHeightUnit.selection = ahUnitIdx;

        rowAreaAttrs2.add("statictext", undefined, "  行配置 : ");
        var dropAreaVJust = rowAreaAttrs2.add("dropdownlist", undefined, ["上揃え", "中央揃え", "下揃え", "均等配置"]);
        dropAreaVJust.preferredSize = [82, 22];
        var aVJustIdx = 0;
        if (settings.areaVerticalJustification === "center") aVJustIdx = 1;
        else if (settings.areaVerticalJustification === "bottom") aVJustIdx = 2;
        else if (settings.areaVerticalJustification === "justify") aVJustIdx = 3;
        dropAreaVJust.selection = aVJustIdx;

        function updateSettingsUnitAttrLabels() {
            var isPVert = (dropPointOrient.selection && dropPointOrient.selection.index === 1);
            var pjSel = dropPointJust.selection ? dropPointJust.selection.index : 0;
            dropPointJust.removeAll();
            dropPointJust.add("item", isPVert ? "上揃え" : "左揃え");
            dropPointJust.add("item", "中央揃え");
            dropPointJust.add("item", isPVert ? "下揃え" : "右揃え");
            dropPointJust.add("item", "均等割付");
            dropPointJust.selection = (pjSel >= 0 && pjSel < 4) ? pjSel : 0;

            var isAVert = (dropAreaOrient.selection && dropAreaOrient.selection.index === 1);
            var ajSel = dropAreaJust.selection ? dropAreaJust.selection.index : 0;
            dropAreaJust.removeAll();
            dropAreaJust.add("item", isAVert ? "上揃え" : "左揃え");
            dropAreaJust.add("item", "中央揃え");
            dropAreaJust.add("item", isAVert ? "下揃え" : "右揃え");
            dropAreaJust.add("item", "均等割付");
            dropAreaJust.selection = (ajSel >= 0 && ajSel < 4) ? ajSel : 0;

            var avSel = dropAreaVJust.selection ? dropAreaVJust.selection.index : 0;
            dropAreaVJust.removeAll();
            dropAreaVJust.add("item", isAVert ? "右揃え" : "上揃え");
            dropAreaVJust.add("item", "中央揃え");
            dropAreaVJust.add("item", isAVert ? "左揃え" : "下揃え");
            dropAreaVJust.add("item", "均等配置");
            dropAreaVJust.selection = (avSel >= 0 && avSel < 4) ? avSel : 0;
        }
        dropPointOrient.onChange = function () {
            updateSettingsUnitAttrLabels();
            markSettingsDirty();
        };
        dropAreaOrient.onChange = function () {
            updateSettingsUnitAttrLabels();
            markSettingsDirty();
        };
        updateSettingsUnitAttrLabels();

        // =========================================================
        // 【右列設定パネル】
        // =========================================================

        // --- フレーム4: 解釈形式ごとの設定 ---
        var formatBox = rightSettingsCol.add("panel", undefined, "解釈形式ごとの設定");
        formatBox.orientation = "column";
        formatBox.alignChildren = "fill";
        formatBox.spacing = 4;
        formatBox.margins = [10, 12, 10, 8];

        // 1. Row 形式の選択
        var rowFormatType = formatBox.add("group");
        rowFormatType.orientation = "row";
        rowFormatType.alignChildren = ["left", "center"];
        rowFormatType.spacing = 6;
        rowFormatType.add("statictext", undefined, "形式 : ");
        var dropFormatType = rowFormatType.add("dropdownlist", undefined, ["Markdown", "CSV/TSV"]);
        dropFormatType.preferredSize = [150, 22];
        dropFormatType.selection = (settings.settingsFormatView === "csv") ? 1 : 0;

        // ---- Markdown サブグループ ----
        var mdSubGroup = formatBox.add("group");
        mdSubGroup.orientation = "column";
        mdSubGroup.alignChildren = "fill";
        mdSubGroup.spacing = 4;

        // 1. Row 見出しの分割設定
        var rowMdHeading = mdSubGroup.add("group");
        rowMdHeading.orientation = "row";
        rowMdHeading.alignChildren = ["left", "center"];
        rowMdHeading.spacing = 6;
        rowMdHeading.add("statictext", undefined, "見出しの分割設定 : ");
        var dropMdHeadingMode = rowMdHeading.add("dropdownlist", undefined, [
            "独立したユニットとして分割(ポイント文字)",
            "独立したユニットとして分割(エリア内文字)",
            "下の部分と結合して分割 ; 次の見出しの直前まで",
            "下の部分と結合して分割 ; 一番大きな見出しごと"
        ]);
        dropMdHeadingMode.preferredSize = [285, 22];
        var hModeIdx = 0;
        if (settings.mdHeadingMode === "independent_area") hModeIdx = 1;
        else if (settings.mdHeadingMode === "merge_next") hModeIdx = 2;
        else if (settings.mdHeadingMode === "merge_h1") hModeIdx = 3;
        dropMdHeadingMode.selection = hModeIdx;

        // 2. Row 見出しごとのサイズ設定
        var rowHSize = mdSubGroup.add("group");
        rowHSize.orientation = "row";
        rowHSize.alignChildren = ["left", "center"];
        rowHSize.spacing = 2;

        var chkMdHeadingSizes = rowHSize.add("checkbox", undefined, "見出しごとのサイズ設定");
        chkMdHeadingSizes.value = (settings.mdUseHeadingSizes === true);

        var curHSizes = settings.mdHeadingSizes || { h1: 24, h2: 20, h3: 16, h4: 14, h5: 12, h6: 10 };
        rowHSize.add("statictext", undefined, "H1:");
        var editH1 = rowHSize.add("edittext", undefined, String(curHSizes.h1 || 24));
        editH1.characters = 2;
        rowHSize.add("statictext", undefined, "H2:");
        var editH2 = rowHSize.add("edittext", undefined, String(curHSizes.h2 || 20));
        editH2.characters = 2;
        rowHSize.add("statictext", undefined, "H3:");
        var editH3 = rowHSize.add("edittext", undefined, String(curHSizes.h3 || 16));
        editH3.characters = 2;
        rowHSize.add("statictext", undefined, "H4:");
        var editH4 = rowHSize.add("edittext", undefined, String(curHSizes.h4 || 14));
        editH4.characters = 2;
        rowHSize.add("statictext", undefined, "H5:");
        var editH5 = rowHSize.add("edittext", undefined, String(curHSizes.h5 || 12));
        editH5.characters = 2;
        rowHSize.add("statictext", undefined, "H6:");
        var editH6 = rowHSize.add("edittext", undefined, String(curHSizes.h6 || 10));
        editH6.characters = 2;

        var dropMdHeadingSizeUnit = rowHSize.add("dropdownlist", undefined, ["pt", "mm", "px"]);
        dropMdHeadingSizeUnit.preferredSize = [48, 20];
        dropMdHeadingSizeUnit.selection = (settings.mdHeadingSizeUnit === "mm") ? 1 : (settings.mdHeadingSizeUnit === "px" ? 2 : 0);

        // 3. Row 見出しの#の処理
        var rowMdHeadingSym = mdSubGroup.add("group");
        rowMdHeadingSym.orientation = "row";
        rowMdHeadingSym.alignChildren = ["left", "center"];
        rowMdHeadingSym.spacing = 6;
        rowMdHeadingSym.add("statictext", undefined, "見出しの#の処理 : ");
        var dropMdHeadingSymbol = rowMdHeadingSym.add("dropdownlist", undefined, [
            "見出しの#を隠す",
            "ソースモードのままにする"
        ]);
        dropMdHeadingSymbol.preferredSize = [220, 22];
        dropMdHeadingSymbol.selection = (settings.mdHeadingSymbol === "source") ? 1 : 0;

        // 4. Row 箇条書きの分割判定
        var rowMdList = mdSubGroup.add("group");
        rowMdList.orientation = "row";
        rowMdList.alignChildren = ["left", "center"];
        rowMdList.spacing = 6;
        rowMdList.add("statictext", undefined, "箇条書きの分割 : ");
        var dropMdListMode = rowMdList.add("dropdownlist", undefined, [
            "リスト項目ごとに独立したブロックとして分割",
            "ネストされたリストブロックを、親ごとに独立したブロックとして分割",
            "リストブロック全体を独立したユニットとして分割"
        ]);
        dropMdListMode.preferredSize = [285, 22];
        var lModeIdx = 0;
        if (settings.mdListMode === "nested") lModeIdx = 1;
        else if (settings.mdListMode === "block") lModeIdx = 2;
        dropMdListMode.selection = lModeIdx;

        // 5. Row 箇条書きの記号の処理
        var rowMdListSym = mdSubGroup.add("group");
        rowMdListSym.orientation = "row";
        rowMdListSym.alignChildren = ["left", "center"];
        rowMdListSym.spacing = 6;
        rowMdListSym.add("statictext", undefined, "箇条書きの記号の処理 : ");
        var dropMdListSymbol = rowMdListSym.add("dropdownlist", undefined, [
            "箇条書きの記号を隠す",
            "ソースモードのままにする",
            "Illustratorの箇条書きリスト形式に変換"
        ]);
        dropMdListSymbol.preferredSize = [250, 22];
        var lsIdx = 0;
        if (settings.mdListSymbol === "source") lsIdx = 1;
        else if (settings.mdListSymbol === "convert_list") lsIdx = 2;
        dropMdListSymbol.selection = lsIdx;

        // 6. Row コメントアウトの処理
        var rowMdComment = mdSubGroup.add("group");
        rowMdComment.orientation = "row";
        rowMdComment.alignChildren = ["left", "center"];
        rowMdComment.spacing = 6;
        rowMdComment.add("statictext", undefined, "コメントアウトの処理 : ");
        var dropMdCommentMode = rowMdComment.add("dropdownlist", undefined, [
            "無視する",
            "ソースモードのままにする"
        ]);
        dropMdCommentMode.preferredSize = [220, 22];
        dropMdCommentMode.selection = (settings.mdCommentMode === "source") ? 1 : 0;

        // ---- CSV/TSV サブグループ ----
        var csvSubGroup = formatBox.add("group");
        csvSubGroup.orientation = "column";
        csvSubGroup.alignChildren = "fill";
        csvSubGroup.spacing = 4;

        // 1. 分割単位と配置の連動
        var rowCsvSplit = csvSubGroup.add("group");
        rowCsvSplit.orientation = "row";
        rowCsvSplit.alignChildren = ["left", "center"];
        rowCsvSplit.spacing = 6;
        rowCsvSplit.add("statictext", undefined, "分割単位 : ");
        var dropCsvSplitMode = rowCsvSplit.add("dropdownlist", undefined, [
            "セルごとに分割",
            "行ごとに分割",
            "列ごとに分割",
            "表全体を1つのユニットとする"
        ]);
        dropCsvSplitMode.preferredSize = [240, 22];
        var csvSplitIdx = 0;
        if (settings.csvSplitMode === "row") csvSplitIdx = 1;
        else if (settings.csvSplitMode === "col") csvSplitIdx = 2;
        else if (settings.csvSplitMode === "table") csvSplitIdx = 3;
        dropCsvSplitMode.selection = csvSplitIdx;

        // 2. 横方向（列間）のセル連結文字
        var rowCsvJoiner = csvSubGroup.add("group");
        rowCsvJoiner.orientation = "row";
        rowCsvJoiner.alignChildren = ["left", "center"];
        rowCsvJoiner.spacing = 6;
        var lblCsvJoiner = rowCsvJoiner.add("statictext", undefined, "列の連結文字 : ");
        var dropCsvColJoiner = rowCsvJoiner.add("dropdownlist", undefined, [
            "タブ (\\t)",
            "半角スペース",
            "全角スペース",
            "カンマ (,)",
            "スラッシュ ( / )"
        ]);
        dropCsvColJoiner.preferredSize = [200, 22];
        var cjIdx = 0;
        if (settings.csvColJoiner === "space") cjIdx = 1;
        else if (settings.csvColJoiner === "fullspace") cjIdx = 2;
        else if (settings.csvColJoiner === "comma") cjIdx = 3;
        else if (settings.csvColJoiner === "slash") cjIdx = 4;
        dropCsvColJoiner.selection = cjIdx;

        // 3. 1行目（ヘッダー行）の扱い
        var rowCsvHeader = csvSubGroup.add("group");
        rowCsvHeader.orientation = "row";
        rowCsvHeader.alignChildren = ["left", "center"];
        rowCsvHeader.spacing = 6;
        rowCsvHeader.add("statictext", undefined, "1行目の扱い : ");
        var dropCsvHeaderMode = rowCsvHeader.add("dropdownlist", undefined, [
            "通常のデータとして含める",
            "1行目を除外する (見出し行をスキップ)"
        ]);
        dropCsvHeaderMode.preferredSize = [240, 22];
        dropCsvHeaderMode.selection = (settings.csvHeaderMode === "skip") ? 1 : 0;

        // 4. 区切り文字（デリミタ）
        var rowCsvDelim = csvSubGroup.add("group");
        rowCsvDelim.orientation = "row";
        rowCsvDelim.alignChildren = ["left", "center"];
        rowCsvDelim.spacing = 6;
        rowCsvDelim.add("statictext", undefined, "区切り文字 : ");
        var dropCsvDelimiter = rowCsvDelim.add("dropdownlist", undefined, [
            "自動判定 (カンマ / タブ)",
            "カンマ (,) 固定 (CSV)",
            "タブ (\\t) 固定 (TSV)"
        ]);
        dropCsvDelimiter.preferredSize = [240, 22];
        var cdIdx = 0;
        if (settings.csvDelimiter === "comma") cdIdx = 1;
        else if (settings.csvDelimiter === "tab") cdIdx = 2;
        dropCsvDelimiter.selection = cdIdx;

        // --- フレーム5: 設定の書き出し・読み込み ---
        var configBox = rightSettingsCol.add("panel", undefined, "設定の書き出し・読み込み");
        configBox.orientation = "column";
        configBox.alignChildren = "fill";
        configBox.spacing = 4;
        configBox.margins = [10, 12, 10, 8];

        var rowConfigBtns = configBox.add("group");
        rowConfigBtns.orientation = "row";
        rowConfigBtns.alignChildren = ["left", "center"];
        rowConfigBtns.spacing = 6;
        var btnExportSettings = rowConfigBtns.add("button", undefined, "設定の書き出し");
        btnExportSettings.preferredSize = [120, 22];
        var btnImportSettings = rowConfigBtns.add("button", undefined, "設定の読み込み");
        btnImportSettings.preferredSize = [120, 22];
        var btnResetSettings = rowConfigBtns.add("button", undefined, "初期値にリセット");
        btnResetSettings.preferredSize = [120, 22];

        var rowConfigStatus = configBox.add("group");
        rowConfigStatus.orientation = "row";
        var lblConfigStatus = rowConfigStatus.add("statictext", undefined, "設定は自動保存されています。スクリプトの外部に設定を保存したい場合に使用してください。");
        lblConfigStatus.graphics.foregroundColor = lblConfigStatus.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.35, 0.35, 0.35, 1], 1);

        function updateSubParamsState() {
            var isAuto = (dropDetectMode.selection && dropDetectMode.selection.index === 0);
            chkCharThreshold.enabled = isAuto;
            thresholdInput.enabled = isAuto && chkCharThreshold.value;
            chkTypeMarkers.enabled = isAuto;

            dropMarker.enabled = chkMarker.value;
            customMarkerInput.enabled = chkMarker.value && (dropMarker.selection && dropMarker.selection.text === "入力したマーカー");
            blankLinesInput.enabled = chkBlankLines.value;

            // 解釈形式ごとの設定パネル切り替え (0 = Markdown, 1 = CSV/TSV)
            var isCsvView = (dropFormatType.selection && dropFormatType.selection.index === 1);
            if (isCsvView) {
                mdSubGroup.visible = false;
                mdSubGroup.maximumSize = [0, 0];
                mdSubGroup.preferredSize = [0, 0];
                csvSubGroup.maximumSize = [500, 500];
                csvSubGroup.preferredSize = [-1, -1];
                csvSubGroup.visible = true;
            } else {
                csvSubGroup.visible = false;
                csvSubGroup.maximumSize = [0, 0];
                csvSubGroup.preferredSize = [0, 0];
                mdSubGroup.maximumSize = [500, 500];
                mdSubGroup.preferredSize = [-1, -1];
                mdSubGroup.visible = true;
            }

            // Markdown見出し個別サイズの活性制御 (独立分割時のみ)
            var isIndepHeading = (dropMdHeadingMode.selection && (dropMdHeadingMode.selection.index === 0 || dropMdHeadingMode.selection.index === 1));
            chkMdHeadingSizes.enabled = isIndepHeading;
            var hEnabled = isIndepHeading && chkMdHeadingSizes.value;
            editH1.enabled = hEnabled;
            editH2.enabled = hEnabled;
            editH3.enabled = hEnabled;
            editH4.enabled = hEnabled;
            editH5.enabled = hEnabled;
            editH6.enabled = hEnabled;
            dropMdHeadingSizeUnit.enabled = hEnabled;

            // CSV列の連結文字の活性制御 (行ごとに分割 or 表全体のみ有効)
            var csvModeSel = dropCsvSplitMode.selection ? dropCsvSplitMode.selection.index : 0;
            var joinerEnabled = (csvModeSel === 1 || csvModeSel === 3);
            lblCsvJoiner.enabled = joinerEnabled;
            dropCsvColJoiner.enabled = joinerEnabled;

            try {
                formatBox.layout.layout(true);
                rightSettingsCol.layout.layout(true);
            } catch (e) {}

            validateMarkerUI();
            markSettingsDirty();
        }

        dropDetectMode.onChange = updateSubParamsState;
        radBoundaryOr.onClick = function () {
            markSettingsDirty();
        };
        radBoundaryAnd.onClick = function () {
            markSettingsDirty();
        };
        chkMarker.onClick = updateSubParamsState;
        chkCharThreshold.onClick = updateSubParamsState;
        chkBlankLines.onClick = updateSubParamsState;
        dropFormatType.onChange = updateSubParamsState;
        dropEditorFormat.onChange = function () {
            if (!dropEditorFormat.selection) return;
            var edIdx = dropEditorFormat.selection.index;
            settings.formatType = (edIdx === 0) ? "txt" : (edIdx === 2 ? "csv" : "md");
            markSettingsDirty();
        };
        dropMdHeadingMode.onChange = updateSubParamsState;
        chkMdHeadingSizes.onClick = updateSubParamsState;
        dropCsvSplitMode.onChange = updateSubParamsState;
        updateSubParamsState();

        tabbedPanel.selection = tabEditor;

        // =========================================================
        // 最下部: ステータス＆アクション
        // =========================================================
        var bottomBar = win.add("group");
        bottomBar.orientation = "row";
        bottomBar.alignChildren = ["fill", "center"];
        bottomBar.spacing = 10;

        var statusText = bottomBar.add("statictext", undefined, "ステータス : テキストが入力されていません (モデル表示中)");
        statusText.preferredSize = [495, 22];
        statusText.graphics.foregroundColor = statusText.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.2, 0.45, 0.2, 1], 1);

        // 通常展開時のアクションボタン群
        var normalActionBtns = bottomBar.add("group");
        normalActionBtns.orientation = "row";
        normalActionBtns.spacing = 8;
        normalActionBtns.alignment = "right";

        var btnLayoutSettings = normalActionBtns.add("button", undefined, "配置設定");
        btnLayoutSettings.preferredSize = [80, 24];
        btnLayoutSettings.helpTip = "テキストオブジェクトの配置方法（縦1列、横1列、グリッド）、間隔、基準位置を設定します";
        btnLayoutSettings.enabled = !isSelectionMode;

        var previewBtn = normalActionBtns.add("button", undefined, "プレビュー");
        var applyBtn = normalActionBtns.add("button", undefined, "作成");
        var cancelBtn = normalActionBtns.add("button", undefined, "キャンセル");

        // プレビュー時（畳み時）の3ボタン群
        var previewActionBtns = bottomBar.add("group");
        previewActionBtns.orientation = "row";
        previewActionBtns.spacing = 8;
        previewActionBtns.alignment = "right";
        previewActionBtns.visible = false;

        var btnReturnToEdit = previewActionBtns.add("button", undefined, "編集に戻る");
        var btnConfirmPreview = previewActionBtns.add("button", undefined, "作成");
        var btnCancelPreview = previewActionBtns.add("button", undefined, "キャンセル");

        // -------------------------
        // 再分割・ロック制御関数
        // -------------------------
        var isDirtyLocked = false;

        /**
         * 原稿テキストや各種設定が変更された場合に、再分割が実行されるまで
         * 作成・プレビュー・個別編集をロック（非活性化）する
         * @param {boolean} isDirty ロック状態にするか否か
         */
        function updateUnitActionButtonsState() {
            if (isDirtyLocked || blockItems.length === 0) {
                btnRemoveBlock.enabled = false;
                btnMergeUp.enabled = false;
                btnMoveUp.enabled = false;
                btnMoveDown.enabled = false;
                return;
            }
            var sel = getSelectedUnitIndices();
            var hasChecked = (sel.length > 0);
            var isCsvCellOrTableMode = (settings.formatType === "csv" && settings.useFormatSplit !== false && (settings.csvSplitMode === "cell" || settings.csvSplitMode === "table"));
            btnRemoveBlock.enabled = hasChecked;
            btnMergeUp.enabled = hasChecked && !isSelectionMode && !isCsvCellOrTableMode;
            btnMoveUp.enabled = hasChecked && !isSelectionMode && !isCsvCellOrTableMode;
            btnMoveDown.enabled = hasChecked && !isSelectionMode && !isCsvCellOrTableMode;
        }

        function setDirtyLock(isDirty) {
            if (isDirty && blockItems.length === 0) {
                isDirty = false;
            }

            isDirtyLocked = isDirty;
            btnLayoutSettings.enabled = !isSelectionMode;

            if (isDirty) {
                applyBtn.enabled = false;
                previewBtn.enabled = false;
                blockList.enabled = false;
                inspectorBox.enabled = false;
                btnToggleSelectAll.enabled = false;
                btnAllPoint.enabled = false;
                btnAllArea.enabled = false;
                btnRemoveBlock.enabled = false;
                btnMergeUp.enabled = false;
                btnMoveUp.enabled = false;
                btnMoveDown.enabled = false;

                splitBtn.text = "分割・属性を再定義";
                statusText.text = "ステータス : 設定または原稿が変更されました。'分割・属性を再定義' を押してください";
                statusText.graphics.foregroundColor = statusText.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.85, 0.35, 0.0, 1], 1);
            } else {
                var hasBlocks = (blockItems.length > 0);
                applyBtn.enabled = hasBlocks;
                previewBtn.enabled = hasBlocks;
                blockList.enabled = true;
                btnToggleSelectAll.enabled = hasBlocks;
                btnAllPoint.enabled = hasBlocks && !isSelectionMode;
                btnAllArea.enabled = hasBlocks && !isSelectionMode;
                updateUnitActionButtonsState();

                var selCount = getSelectedUnitIndices().length;
                if (hasBlocks && selCount > 0) {
                    inspectorBox.enabled = true;
                } else {
                    inspectorBox.enabled = false;
                }

                splitBtn.text = "自動テキスト分割・属性判定";
                statusText.graphics.foregroundColor = statusText.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.2, 0.45, 0.2, 1], 1);
            }
        }

        function markSettingsDirty() {
            if (blockItems && blockItems.length > 0) {
                setDirtyLock(true);
            }
        }

        function attachSettingsChangeListeners() {
            var changeElements = [
                dropMdHeadingSymbol, dropMdHeadingSizeUnit,
                dropMdListMode, dropMdListSymbol, dropMdCommentMode,
                dropCsvColJoiner, dropCsvHeaderMode, dropCsvDelimiter,
                dropPointSizeUnit, dropPointJust,
                dropAreaSizeUnit, dropAreaWidthUnit, dropAreaHeightUnit, dropAreaJust, dropAreaVJust
            ];
            for (var i = 0; i < changeElements.length; i++) {
                if (changeElements[i]) {
                    (function (el) {
                        var prev = el.onChange;
                        el.onChange = function () {
                            if (prev) prev.apply(this, arguments);
                            markSettingsDirty();
                        };
                    })(changeElements[i]);
                }
            }

            var changingElements = [
                customMarkerInput, blankLinesInput, thresholdInput,
                editH1, editH2, editH3, editH4, editH5, editH6,
                pointSizeInput,
                areaSizeInput, areaWidthInput, areaHeightInput
            ];
            for (var j = 0; j < changingElements.length; j++) {
                if (changingElements[j]) {
                    (function (el) {
                        var prev = el.onChanging;
                        el.onChanging = function () {
                            if (prev) prev.apply(this, arguments);
                            markSettingsDirty();
                        };
                    })(changingElements[j]);
                }
            }

            var clickElements = [
                chkMarkdownHeaders, chkTypeMarkers
            ];
            for (var k = 0; k < clickElements.length; k++) {
                if (clickElements[k]) {
                    (function (el) {
                        var prev = el.onClick;
                        el.onClick = function () {
                            if (prev) prev.apply(this, arguments);
                            markSettingsDirty();
                        };
                    })(clickElements[k]);
                }
            }
        }
        attachSettingsChangeListeners();

        // 初期状態でのボタン有効状態のセット
        setDirtyLock(false);

        // -------------------------
        // ユニット一覧・インスペクタ制御関数
        // -------------------------

        function syncSettingsFromUI() {
            // 判定モード
            if (dropDetectMode.selection && dropDetectMode.selection.index === 1) {
                settings.detectMode = "all_point";
            } else if (dropDetectMode.selection && dropDetectMode.selection.index === 2) {
                settings.detectMode = "all_area";
            } else {
                settings.detectMode = "auto";
            }

            // 境界設定
            settings.boundaryMode = radBoundaryAnd.value ? "and" : "or";
            settings.useBoundaryMarker = chkMarker.value;
            var markerSelText = (dropMarker && dropMarker.selection) ? dropMarker.selection.text : "";
            if (markerSelText === "入力したマーカー") {
                settings.boundaryMarker = customMarkerInput.text;
            } else if (markerSelText) {
                settings.boundaryMarker = markerSelText;
            }
            settings.useBlankLines = chkBlankLines.value;
            settings.blankLinesCount = parseInt(blankLinesInput.text, 10) || 1;
            settings.useFormatSplit = chkMarkdownHeaders.value;
            settings.useMarkdownHeaders = chkMarkdownHeaders.value;

            // 編集タブの形式選択 (一時セッション入力の解釈形式)
            var edIdx = dropEditorFormat.selection ? dropEditorFormat.selection.index : 1;
            settings.formatType = (edIdx === 0) ? "txt" : (edIdx === 2 ? "csv" : "md");

            // 標準設定タブの解釈形式サブパネル表示切替
            settings.settingsFormatView = (dropFormatType.selection && dropFormatType.selection.index === 1) ? "csv" : "md";

            // Markdown解釈設定
            var hmIdx = dropMdHeadingMode.selection ? dropMdHeadingMode.selection.index : 0;
            if (hmIdx === 1) settings.mdHeadingMode = "independent_area";
            else if (hmIdx === 2) settings.mdHeadingMode = "merge_next";
            else if (hmIdx === 3) settings.mdHeadingMode = "merge_h1";
            else settings.mdHeadingMode = "independent_point";

            settings.mdHeadingSymbol = (dropMdHeadingSymbol.selection && dropMdHeadingSymbol.selection.index === 1) ? "source" : "hide";

            settings.mdUseHeadingSizes = chkMdHeadingSizes.value;
            settings.mdHeadingSizes = {
                h1: parseFloat(editH1.text) || 24,
                h2: parseFloat(editH2.text) || 20,
                h3: parseFloat(editH3.text) || 16,
                h4: parseFloat(editH4.text) || 14,
                h5: parseFloat(editH5.text) || 12,
                h6: parseFloat(editH6.text) || 10
            };
            if (dropMdHeadingSizeUnit.selection) {
                settings.mdHeadingSizeUnit = dropMdHeadingSizeUnit.selection.text;
            }

            var lmIdx = dropMdListMode.selection ? dropMdListMode.selection.index : 0;
            settings.mdListMode = (lmIdx === 1) ? "nested" : (lmIdx === 2 ? "block" : "item");

            var lsIdx = dropMdListSymbol.selection ? dropMdListSymbol.selection.index : 0;
            settings.mdListSymbol = (lsIdx === 1) ? "source" : (lsIdx === 2 ? "convert_list" : "hide");
            settings.mdCommentMode = (dropMdCommentMode.selection && dropMdCommentMode.selection.index === 1) ? "source" : "ignore";

            // CSV/TSV解釈設定
            var csmIdx = dropCsvSplitMode.selection ? dropCsvSplitMode.selection.index : 0;
            if (csmIdx === 1) settings.csvSplitMode = "row";
            else if (csmIdx === 2) settings.csvSplitMode = "col";
            else if (csmIdx === 3) settings.csvSplitMode = "table";
            else settings.csvSplitMode = "cell";

            var ccjIdx = dropCsvColJoiner.selection ? dropCsvColJoiner.selection.index : 0;
            if (ccjIdx === 1) settings.csvColJoiner = "space";
            else if (ccjIdx === 2) settings.csvColJoiner = "fullspace";
            else if (ccjIdx === 3) settings.csvColJoiner = "comma";
            else if (ccjIdx === 4) settings.csvColJoiner = "slash";
            else settings.csvColJoiner = "tab";

            settings.csvHeaderMode = (dropCsvHeaderMode.selection && dropCsvHeaderMode.selection.index === 1) ? "skip" : "include";

            var cdlIdx = dropCsvDelimiter.selection ? dropCsvDelimiter.selection.index : 0;
            settings.csvDelimiter = (cdlIdx === 1) ? "comma" : (cdlIdx === 2 ? "tab" : "auto");

            // 種別判定設定
            settings.useTypeMarkers = chkTypeMarkers.value;
            settings.useCharThreshold = chkCharThreshold.value;
            settings.autoTagThreshold = parseInt(thresholdInput.text, 10) || 30;

            // ポイント文字標準設定
            settings.pointSize = parseFloat(pointSizeInput.text) || 14;
            if (dropPointSizeUnit.selection) {
                settings.pointSizeUnit = dropPointSizeUnit.selection.text;
            }
            settings.pointOrientation = (dropPointOrient.selection && dropPointOrient.selection.index === 1) ? "vertical" : "horizontal";
            var pjIdx = dropPointJust.selection ? dropPointJust.selection.index : 0;
            settings.pointJustification = (pjIdx === 1) ? "center" : (pjIdx === 2 ? "right" : (pjIdx === 3 ? "justify" : "left"));
            settings.pointFont = rowPFont.getFont();

            // エリア内文字標準設定
            settings.areaSize = parseFloat(areaSizeInput.text) || 10;
            if (dropAreaSizeUnit.selection) {
                settings.areaSizeUnit = dropAreaSizeUnit.selection.text;
            }
            settings.areaOrientation = (dropAreaOrient.selection && dropAreaOrient.selection.index === 1) ? "vertical" : "horizontal";
            settings.areaLineLength = parseFloat(areaWidthInput.text) || 300;
            settings.areaWidth = settings.areaLineLength;
            if (dropAreaWidthUnit.selection) {
                settings.areaLineLengthUnit = dropAreaWidthUnit.selection.text;
                settings.areaWidthUnit = settings.areaLineLengthUnit;
            }
            settings.areaLineCount = parseFloat(areaHeightInput.text) || 0;
            settings.areaHeight = settings.areaLineCount;
            if (dropAreaHeightUnit.selection) {
                settings.areaLineCountUnit = dropAreaHeightUnit.selection.text;
                settings.areaHeightUnit = settings.areaLineCountUnit;
            }
            var ajIdx = dropAreaJust.selection ? dropAreaJust.selection.index : 0;
            settings.areaJustification = (ajIdx === 1) ? "center" : (ajIdx === 2 ? "right" : (ajIdx === 3 ? "justify" : "left"));
            var avIdx = dropAreaVJust.selection ? dropAreaVJust.selection.index : 0;
            settings.areaVerticalJustification = (avIdx === 1) ? "center" : (avIdx === 2 ? "bottom" : (avIdx === 3 ? "justify" : "top"));
            settings.areaFont = rowAFont.getFont();

            // 全体の標準組み方向はポイント・エリアの組み方向と整合させる
            settings.textOrientation = (settings.pointOrientation === "vertical" && settings.areaOrientation === "vertical") ? "vertical" : "horizontal";

            if (settings.sameSpacing !== false && settings.spacing !== undefined) {
                settings.rowSpacing = settings.spacing;
                settings.colSpacing = settings.spacing;
            }
            if (!settings.layoutMode) settings.layoutMode = "stack_v";
            if (!settings.gridColumns) settings.gridColumns = 2;
            if (!settings.gridRows) settings.gridRows = 2;

            PlaceTextConfig.saveSettings(settings);
            return settings;
        }

        function applySettingsToUI(s) {
            if (!s) return;
            // 判定モード
            if (s.detectMode === "all_point") dropDetectMode.selection = 1;
            else if (s.detectMode === "all_area") dropDetectMode.selection = 2;
            else dropDetectMode.selection = 0;

            // 境界
            if (s.boundaryMode === "and") {
                radBoundaryOr.value = false;
                radBoundaryAnd.value = true;
            } else {
                radBoundaryOr.value = true;
                radBoundaryAnd.value = false;
            }
            chkMarker.value = (s.useBoundaryMarker === true);
            var currentSaved = s.boundaryMarker || "---";
            var pFound = false;
            for (var p = 0; p < MARKER_PRESETS.length - 1; p++) {
                if (MARKER_PRESETS[p] === currentSaved) {
                    dropMarker.selection = p;
                    pFound = true;
                    break;
                }
            }
            if (!pFound) {
                dropMarker.selection = MARKER_PRESETS.length - 1;
                customMarkerInput.text = currentSaved;
                customMarkerInput.enabled = chkMarker.value;
            } else {
                customMarkerInput.text = currentSaved;
                customMarkerInput.enabled = false;
            }

            chkBlankLines.value = (s.useBlankLines !== false);
            blankLinesInput.text = String(s.blankLinesCount || 1);
            chkMarkdownHeaders.value = (s.useFormatSplit !== undefined) ? (s.useFormatSplit !== false) : (s.useMarkdownHeaders !== false);

            // 種別判定
            chkCharThreshold.value = (s.useCharThreshold !== false);
            thresholdInput.text = String(s.autoTagThreshold || 30);
            chkTypeMarkers.value = (s.useTypeMarkers !== false);

            // 編集タブ形式
            var edFmtIdx = 1;
            if (s.formatType === "txt") edFmtIdx = 0;
            else if (s.formatType === "csv") edFmtIdx = 2;
            dropEditorFormat.selection = edFmtIdx;

            // 標準設定タブ 解釈形式パネル切替
            dropFormatType.selection = (s.settingsFormatView === "csv") ? 1 : 0;

            // Markdown設定
            var hmIdx = 0;
            if (s.mdHeadingMode === "independent_area") hmIdx = 1;
            else if (s.mdHeadingMode === "merge_next") hmIdx = 2;
            else if (s.mdHeadingMode === "merge_h1") hmIdx = 3;
            dropMdHeadingMode.selection = hmIdx;

            dropMdHeadingSymbol.selection = (s.mdHeadingSymbol === "source") ? 1 : 0;

            chkMdHeadingSizes.value = (s.mdUseHeadingSizes === true);
            var hs = s.mdHeadingSizes || { h1: 24, h2: 20, h3: 16, h4: 14, h5: 12, h6: 10 };
            editH1.text = String(hs.h1 || 24);
            editH2.text = String(hs.h2 || 20);
            editH3.text = String(hs.h3 || 16);
            editH4.text = String(hs.h4 || 14);
            editH5.text = String(hs.h5 || 12);
            editH6.text = String(hs.h6 || 10);
            dropMdHeadingSizeUnit.selection = (s.mdHeadingSizeUnit === "mm") ? 1 : (s.mdHeadingSizeUnit === "px" ? 2 : 0);

            var lmIdx = 0;
            if (s.mdListMode === "nested") lmIdx = 1;
            else if (s.mdListMode === "block") lmIdx = 2;
            dropMdListMode.selection = lmIdx;

            var lsIdx = 0;
            if (s.mdListSymbol === "source") lsIdx = 1;
            else if (s.mdListSymbol === "convert_list") lsIdx = 2;
            dropMdListSymbol.selection = lsIdx;

            dropMdCommentMode.selection = (s.mdCommentMode === "source") ? 1 : 0;

            // CSV/TSV設定
            var csmIdx = 0;
            if (s.csvSplitMode === "row") csmIdx = 1;
            else if (s.csvSplitMode === "col") csmIdx = 2;
            else if (s.csvSplitMode === "table") csmIdx = 3;
            dropCsvSplitMode.selection = csmIdx;

            var ccjIdx = 0;
            if (s.csvColJoiner === "space") ccjIdx = 1;
            else if (s.csvColJoiner === "fullspace") ccjIdx = 2;
            else if (s.csvColJoiner === "comma") ccjIdx = 3;
            else if (s.csvColJoiner === "slash") ccjIdx = 4;
            dropCsvColJoiner.selection = ccjIdx;

            dropCsvHeaderMode.selection = (s.csvHeaderMode === "skip") ? 1 : 0;

            var cdlIdx = 0;
            if (s.csvDelimiter === "comma") cdlIdx = 1;
            else if (s.csvDelimiter === "tab") cdlIdx = 2;
            dropCsvDelimiter.selection = cdlIdx;

            // ポイント文字
            pointSizeInput.text = String(s.pointSize || 14);
            dropPointSizeUnit.selection = (s.pointSizeUnit === "mm") ? 1 : (s.pointSizeUnit === "px" ? 2 : 0);
            var pOrient = s.pointOrientation || s.textOrientation || "horizontal";
            dropPointOrient.selection = (pOrient === "vertical") ? 1 : 0;
            rowPFont.setFont(s.pointFont || "");

            // エリア内文字
            areaSizeInput.text = String(s.areaSize || 10);
            dropAreaSizeUnit.selection = (s.areaSizeUnit === "mm") ? 1 : (s.areaSizeUnit === "px" ? 2 : 0);
            var aOrient = s.areaOrientation || s.textOrientation || "horizontal";
            dropAreaOrient.selection = (aOrient === "vertical") ? 1 : 0;
            rowAFont.setFont(s.areaFont || "");

            areaWidthInput.text = String(s.areaLineLength || s.areaWidth || 300);
            var awU = s.areaLineLengthUnit || s.areaWidthUnit || "pt";
            dropAreaWidthUnit.selection = (awU === "mm") ? 1 : (awU === "px" ? 2 : 0);

            var acVal = (s.areaLineCount !== undefined) ? s.areaLineCount : (s.areaHeight || 0);
            areaHeightInput.text = String(acVal);
            var ahU = s.areaLineCountUnit || s.areaHeightUnit || "行";
            var ahUIdx = 0;
            if (ahU === "pt") ahUIdx = 1;
            else if (ahU === "mm") ahUIdx = 2;
            else if (ahU === "px") ahUIdx = 3;
            dropAreaHeightUnit.selection = ahUIdx;

            updateSettingsUnitAttrLabels();

            var pjIdx = 0;
            if (s.pointJustification === "center") pjIdx = 1;
            else if (s.pointJustification === "right") pjIdx = 2;
            else if (s.pointJustification === "justify") pjIdx = 3;
            dropPointJust.selection = pjIdx;

            var ajIdx = 0;
            if (s.areaJustification === "center") ajIdx = 1;
            else if (s.areaJustification === "right") ajIdx = 2;
            else if (s.areaJustification === "justify") ajIdx = 3;
            dropAreaJust.selection = ajIdx;

            var avIdx = 0;
            if (s.areaVerticalJustification === "center") avIdx = 1;
            else if (s.areaVerticalJustification === "bottom") avIdx = 2;
            else if (s.areaVerticalJustification === "justify") avIdx = 3;
            dropAreaVJust.selection = avIdx;

            updateSubParamsState();
        }

        /**
         * チェックボックスがオンになっているユニットのインデックス配列を取得する
         */
        function getSelectedUnitIndices() {
            var indices = [];
            for (var i = 0; i < blockItems.length; i++) {
                if (blockItems[i] && blockItems[i].isSelected) {
                    indices.push(i);
                }
            }
            return indices;
        }

        /**
         * インスペクタ編集やユニット単位操作の対象となるユニットインデックス配列を取得する
         * チェックボックス（[ ✓ ]）がオンになっているユニットのみを対象とし、未チェック時は空配列を返す
         */
        function getTargetIndices() {
            return getSelectedUnitIndices();
        }

        var isRefreshingListBox = false;

        /**
         * ScriptUI マルチカラム ListBox の行描画キャッシュ（選択ハイライト行の subItems 非更新・同一行再クリック時の onChange 非発火）を
         * 回避し、リアルタイムに一覧表記を更新する。
         */
        function refreshListBoxRows() {
            if (isRefreshingListBox) return;
            isRefreshingListBox = true;
            try {
                blockList.removeAll();
                for (var i = 0; i < blockItems.length; i++) {
                    var item = blockItems[i];
                    var summary = PlaceTextParser.formatBlockSummary(item);
                    var li = blockList.add("item", item.isSelected ? "[ ✓ ]" : "[ ]");
                    if (li.subItems && li.subItems.length >= 4) {
                        li.subItems[0].text = String(i + 1);
                        if (item.isDeleted) {
                            li.subItems[1].text = "削除";
                            li.subItems[2].text = "-";
                            li.subItems[3].text = "[削除済み]";
                        } else {
                            li.subItems[1].text = summary.typeLabel;
                            li.subItems[2].text = summary.sizeLabel;
                            li.subItems[3].text = summary.previewText;
                        }
                    }
                }
                // selection を null にリセットすることで、選択行のキャッシュ固定を防ぎ、同一行の連続クリックでも毎回 onChange を発火させる
                blockList.selection = null;
                if (win && typeof win.update === "function") {
                    win.update();
                }
            } catch (e) {}
            isRefreshingListBox = false;
        }

        function updateListBoxRow(idx, skipWinUpdate) {
            if (idx < 0 || idx >= blockItems.length) return;
            if (!skipWinUpdate) {
                refreshListBoxRows();
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
                if (blockItems.length > 0) {
                    setDirtyLock(true);
                }
                var real = getRealInputText();
                if (!isDirtyLocked) {
                    statusText.text = "ステータス : テキスト編集欄にタブ文字を挿入しました (" + real.length + " 文字)";
                }
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
                    if (blockItems.length > 0) {
                        setDirtyLock(true);
                    }
                    if (!isDirtyLocked) {
                        statusText.text = "ステータス : テキストの編集を元に戻しました (" + prevInput.length + " 文字)";
                    }
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
                    if (blockItems.length > 0) {
                        setDirtyLock(true);
                    }
                    if (!isDirtyLocked) {
                        statusText.text = "ステータス : テキストの編集をやり直しました (" + nextInput.length + " 文字)";
                    }
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
            var selIndices = getSelectedUnitIndices();
            var isMulti = (selIndices.length > 1);
            var targetIdx = (selIndices.length > 0) ? selIndices[0] : -1;
            selectedBlockIndex = targetIdx;
            updateUnitActionButtonsState();

            if (targetIdx < 0 || targetIdx >= blockItems.length) {
                inspectorBox.enabled = false;
                inspectorBox.text = "選択ユニットの編集";
                radTypePoint.value = true;
                radTypeArea.value = false;
                radOrientH.value = true;
                radOrientV.value = false;
                updateAlignmentDropdownLabels(false);
                editBlockSize.text = "";
                dropBlockSizeUnit.selection = 0;
                dropBlockJust.selection = 0;
                editLineLength.text = "";
                dropLineLengthUnit.selection = 0;
                editLineCount.text = "";
                dropLineCountUnit.selection = 0;
                dropBlockVJust.selection = 0;
                metaRow3.enabled = false;
                editBlockText.text = "";
                blockTextHistory.reset("");
                isUpdatingInspector = false;
                updateHistoryButtonsUI();
                return;
            }

            var item = blockItems[targetIdx];
            inspectorBox.enabled = !isDirtyLocked;

            if (isMulti) {
                inspectorBox.text = "選択ユニットの一括編集 (" + selIndices.length + "件 選択中)";
            } else {
                inspectorBox.text = "選択ユニットの編集 (#" + (targetIdx + 1) + ")";
            }

            // 1行目: 種別・書字方向
            var isArea = (item.type === "area");
            radTypePoint.value = !isArea;
            radTypeArea.value = isArea;
            var allowTypeAndOrientEdit = !isSelectionMode;
            metaRow1.enabled = allowTypeAndOrientEdit;
            radTypePoint.enabled = allowTypeAndOrientEdit;
            radTypeArea.enabled = allowTypeAndOrientEdit;
            radOrientH.enabled = allowTypeAndOrientEdit;
            radOrientV.enabled = allowTypeAndOrientEdit;

            var orientMode = (item.orientation === "vertical") ? "vertical" : "horizontal";
            if (isMulti) {
                var hasH = false;
                var hasV = false;
                for (var m = 0; m < selIndices.length; m++) {
                    var mItem = blockItems[selIndices[m]];
                    if (mItem) {
                        if (mItem.orientation === "vertical") hasV = true;
                        else hasH = true;
                    }
                }
                if (hasH && hasV) {
                    orientMode = "mixed";
                } else if (hasV) {
                    orientMode = "vertical";
                } else {
                    orientMode = "horizontal";
                }
            }

            if (orientMode === "mixed") {
                radOrientH.value = false;
                radOrientV.value = false;
            } else if (orientMode === "vertical") {
                radOrientH.value = false;
                radOrientV.value = true;
            } else {
                radOrientH.value = true;
                radOrientV.value = false;
            }
            updateAlignmentDropdownLabels(orientMode);

            // 2行目: 文字サイズ・文字揃え
            editBlockSize.text = String(item.sizeVal !== undefined ? item.sizeVal : 12);
            var sUnitIdx = 0;
            if (item.sizeUnit === "mm") sUnitIdx = 1;
            else if (item.sizeUnit === "px") sUnitIdx = 2;
            dropBlockSizeUnit.selection = sUnitIdx;

            var curJust = item.justification || (isArea ? settings.areaJustification : settings.pointJustification) || "left";
            var jIdx = 0;
            if (curJust === "center") jIdx = 1;
            else if (curJust === "right") jIdx = 2;
            else if (curJust === "justify") jIdx = 3;
            dropBlockJust.selection = jIdx;

            // 3行目: 行長・行数・行配置 (エリア内文字専用)
            var lLenVal = (item.lineLengthVal !== undefined) ? item.lineLengthVal : (item.widthVal !== undefined ? item.widthVal : 300);
            editLineLength.text = String(lLenVal);
            var lUnit = item.lineLengthUnit || item.widthUnit || "pt";
            var lUnitIdx = 0;
            if (lUnit === "mm") lUnitIdx = 1;
            else if (lUnit === "px") lUnitIdx = 2;
            dropLineLengthUnit.selection = lUnitIdx;

            var lCntVal = (item.lineCountVal !== undefined) ? item.lineCountVal : (item.heightVal !== undefined ? item.heightVal : 0);
            editLineCount.text = String(lCntVal);
            var cUnit = item.lineCountUnit || "行";
            var cUnitIdx = 0;
            if (cUnit === "pt") cUnitIdx = 1;
            else if (cUnit === "mm") cUnitIdx = 2;
            else if (cUnit === "px") cUnitIdx = 3;
            dropLineCountUnit.selection = cUnitIdx;

            var curVJust = item.verticalJustification || settings.areaVerticalJustification || "top";
            var vIdx = 0;
            if (curVJust === "center") vIdx = 1;
            else if (curVJust === "bottom") vIdx = 2;
            else if (curVJust === "justify") vIdx = 3;
            dropBlockVJust.selection = vIdx;

            var allowAreaFrameEdit = isArea && !isSelectionMode;
            metaRow3.enabled = allowAreaFrameEdit;
            lblLineLength.enabled = allowAreaFrameEdit;
            editLineLength.enabled = allowAreaFrameEdit;
            dropLineLengthUnit.enabled = allowAreaFrameEdit;
            lblLineCount.enabled = allowAreaFrameEdit;
            editLineCount.enabled = allowAreaFrameEdit;
            dropLineCountUnit.enabled = allowAreaFrameEdit;
            lblBlockVJust.enabled = allowAreaFrameEdit;
            dropBlockVJust.enabled = allowAreaFrameEdit;

            // 4行目: 本文
            if (isMulti) {
                editBlockText.text = "複数選択中";
                editBlockText.enabled = false;
                blockTextHistory.reset("");
            } else {
                var rawText = item.text || "";
                if (item.isDeleted) {
                    rawText = "[削除済み]";
                }
                var dispText = isEscapedMode ? PlaceTextParser.escapeControlChars(rawText) : rawText;
                var normalizedCRLF = normalizeToCRLF(dispText);
                editBlockText.text = normalizedCRLF;
                editBlockText.enabled = !item.isDeleted;
                blockTextHistory.reset(normalizedCRLF);
            }
            isUpdatingInspector = false;
            updateHistoryButtonsUI();
        }

        function rebuildBlockListUI(selectIdx) {
            refreshListBoxRows();
            if (blockItems.length === 0) {
                selectedBlockIndex = -1;
                loadSelectedBlockToInspector();
            } else {
                var targetIdx = (typeof selectIdx === "number" && selectIdx >= 0 && selectIdx < blockItems.length) ? selectIdx : -1;
                selectedBlockIndex = targetIdx;
                loadSelectedBlockToInspector();
            }
        }

        function syncCsvLayoutSettings(s, items) {
            if (!s || s.formatType !== "csv" || s.useFormatSplit === false) return;
            var cMode = s.csvSplitMode || "cell";
            if (cMode === "cell") {
                s.layoutMode = "grid_col";
                if (items && items.length > 0 && items[0].csvTotalCols > 0) {
                    s.gridColumns = items[0].csvTotalCols;
                }
            } else if (cMode === "row") {
                s.layoutMode = "stack_v";
            } else if (cMode === "col") {
                s.layoutMode = "stack_h";
            } else if (cMode === "table") {
                s.layoutMode = "stack_v";
            }
        }

        function splitAndPopulateBlocks() {
            var currentSettings = syncSettingsFromUI();
            var realText = getRealInputText();
            if (realText.replace(/\s+/g, "").length === 0) {
                PlaceTextErrors.showAlert(PlaceTextErrors.CODES.EMPTY_TEXT);
                return false;
            }
            var newItems = PlaceTextParser.createBlockItems(realText, currentSettings);
            if (blockItems && blockItems.length > 0) {
                blockItems = PlaceTextParser.mergeBlockItems(newItems, blockItems);
            } else {
                blockItems = newItems;
            }
            syncCsvLayoutSettings(currentSettings, blockItems);
            PlaceTextConfig.saveSettings(currentSettings);
            isInputDirty = false;
            setDirtyLock(false);
            rebuildBlockListUI(0);
            statusText.text = "ステータス : ユニット分割・設定反映完了 (" + blockItems.length + " ユニット)";
            return blockItems.length > 0;
        }

        // -------------------------
        // イベントハンドラ
        // -------------------------

        inputBox.onChanging = function () {
            if (isPlaceholder) {
                isPlaceholder = false;
            }
            if (!isSelectionMode) {
                lblCurrentSource.text = "直接入力";
            }
            isInputDirty = true;
            recordInputHistory();
            if (blockItems.length > 0) {
                setDirtyLock(true);
            }
            var real = getRealInputText();
            if (real.replace(/\s+/g, "").length === 0) {
                statusText.text = "ステータス : テキストが入力されていません";
            } else if (!isDirtyLocked) {
                statusText.text = "ステータス : テキスト編集中 (" + real.length + " 文字)";
            }
        };

        loadFileBtn.onClick = function () {
            try {
                var res = PlaceTextIO.chooseAndLoadFile();
                if (res && res.content) {
                    isPlaceholder = false;
                    setSelectionModeUI(false);
                    selectionSourceFrames = [];
                    btnRemoveBlock.text = "選択したユニットを削除";

                    // 拡張子から解釈形式を自動切り替え
                    var lowerName = (res.name || "").toLowerCase();
                    if (/\.md$/i.test(lowerName)) {
                        dropEditorFormat.selection = 1;
                        dropFormatType.selection = 0;
                    } else if (/\.txt$/i.test(lowerName)) {
                        dropEditorFormat.selection = 0;
                    } else if (/\.(csv|tsv)$/i.test(lowerName)) {
                        dropEditorFormat.selection = 2;
                        dropFormatType.selection = 1;
                    }
                    updateSubParamsState();

                    // Windows ScriptUI multiline edittext は \r\n (CRLF) が必須
                    var normalizedText = normalizeToCRLF(res.content);
                    if (isEscapedMode) {
                        normalizedText = PlaceTextParser.escapeControlChars(normalizedText);
                    }
                    inputBox.text = normalizedText;
                    inputBox.active = true;
                    activeEditor = "input";
                    recordInputHistory();
                    lblCurrentSource.text = res.name;
                    var currentSettings = syncSettingsFromUI();
                    blockItems = PlaceTextParser.createBlockItems(res.content, currentSettings);
                    syncCsvLayoutSettings(currentSettings, blockItems);
                    PlaceTextConfig.saveSettings(currentSettings);
                    isInputDirty = false;
                    setDirtyLock(false);
                    rebuildBlockListUI(0);
                    statusText.text = "ステータス : ファイル読込＆ユニット展開完了 (" + res.name + " / " + blockItems.length + " ユニット)";
                }
            } catch (err) {
                PlaceTextErrors.showAlert(PlaceTextErrors.CODES.FILE_IO_FAILED, err.message, err.line);
            }
        };

        function loadFromSelection() {
            try {
                if (!app.selection || app.selection.length === 0) {
                    alert("Illustrator上でテキストオブジェクト（TextFrame）を選択してください。", "PlaceText - 選択オブジェクト");
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
                    alert("選択項目の中に未アウトライン化のテキストオブジェクトが見つかりませんでした。", "PlaceText - 選択オブジェクト");
                    return;
                }

                // 上から下へ配置順（Y座標降順：topが大きい順）にソート
                frames.sort(function (a, b) {
                    return b.top - a.top;
                });

                var contentsList = [];
                for (var j = 0; j < frames.length; j++) {
                    var c = frames[j].contents || "";
                    contentsList.push(c);
                }

                setSelectionModeUI(true);
                selectionSourceFrames = frames;
                btnRemoveBlock.text = "選択したユニットを削除";

                var combined = contentsList.join("\r\n\r\n");
                isPlaceholder = false;
                var normalizedText = normalizeToCRLF(combined);
                if (isEscapedMode) {
                    normalizedText = PlaceTextParser.escapeControlChars(normalizedText);
                }
                inputBox.text = normalizedText;
                inputBox.active = true;
                activeEditor = "input";
                recordInputHistory();
                lblCurrentSource.text = "選択オブジェクト";

                var currentSettings = syncSettingsFromUI();
                blockItems = [];
                for (var k = 0; k < frames.length; k++) {
                    var fr = frames[k];
                    var fText = fr.contents || "";
                    var isArea = false;
                    try {
                        isArea = (typeof TextType !== "undefined" && fr.kind === TextType.AREATEXT);
                    } catch (e) {}
                    var uItem = PlaceTextParser.createBlockItem(fText, isArea ? "area" : "point", currentSettings);
                    try {
                        if (typeof TextOrientation !== "undefined" && fr.orientation === TextOrientation.VERTICAL) {
                            uItem.orientation = "vertical";
                        } else if (typeof TextOrientation !== "undefined" && fr.orientation === TextOrientation.HORIZONTAL) {
                            uItem.orientation = "horizontal";
                        }
                    } catch (e) {}
                    try {
                        if (fr.textRange && fr.textRange.characterAttributes) {
                            var sz = fr.textRange.characterAttributes.size;
                            if (sz && sz > 0) {
                                uItem.size = sz;
                                uItem.sizeVal = sz;
                                uItem.sizeUnit = "pt";
                            }
                        }
                    } catch (e) {}
                    blockItems.push(uItem);
                }

                isInputDirty = false;
                setDirtyLock(false);
                rebuildBlockListUI(0);
                statusText.text = "ステータス : 選択オブジェクト取得＆ユニット展開完了 (" + frames.length + " 件)";
            } catch (err) {
                PlaceTextErrors.showAlert(PlaceTextErrors.CODES.PARSE_FAILED, err.message, err.line);
            }
        }

        loadSelectionBtn.onClick = loadFromSelection;

        directInputBtn.onClick = function () {
            activeEditor = "input";
            if (isSelectionMode) {
                setSelectionModeUI(false);
                selectionSourceFrames = [];
                blockItems = [];
                selectedBlockIndex = -1;
                rebuildBlockListUI(-1);
            }
            btnRemoveBlock.text = "選択したユニットを削除";
            if (isPlaceholder || inputBox.text === PLACEHOLDER_TEXT) {
                hidePlaceholder();
            }
            lblCurrentSource.text = "直接入力";
            setDirtyLock(isDirtyLocked);
            inputBox.active = true;
            updateHistoryButtonsUI();
            statusText.text = "ステータス : 直接入力モード";
        };

        btnInsertTab.onClick = function () {
            insertTabIntoEditor(activeEditor);
        };

        btnEscapeChars.onClick = function () {
            isEscapedMode = !isEscapedMode;
            if (isEscapedMode) {
                btnEscapeChars.text = "制御文字を表示/非表示 (表示中)";
                if (!isPlaceholder && inputBox.text !== PLACEHOLDER_TEXT) {
                    inputBox.text = PlaceTextParser.escapeControlChars(inputBox.text);
                }
                if (inspectorBox.enabled && editBlockText.text && editBlockText.text !== "複数選択中") {
                    editBlockText.text = PlaceTextParser.escapeControlChars(editBlockText.text);
                }
                statusText.text = "ステータス : 制御文字エスケープ表示中 (\\t, \\n, \\r, \\u00A0 などを可視化)";
            } else {
                btnEscapeChars.text = "制御文字を表示/非表示";
                if (!isPlaceholder && inputBox.text !== PLACEHOLDER_TEXT) {
                    inputBox.text = normalizeToCRLF(PlaceTextParser.unescapeControlChars(inputBox.text));
                }
                if (inspectorBox.enabled && editBlockText.text && editBlockText.text !== "複数選択中") {
                    editBlockText.text = normalizeToCRLF(PlaceTextParser.unescapeControlChars(editBlockText.text));
                }
                statusText.text = "ステータス : 通常テキスト表示に戻しました";
            }
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

        btnToggleSelectAll.onClick = function () {
            if (blockItems.length === 0 || isDirtyLocked) return;
            var curSelected = getSelectedUnitIndices().length;
            var selectAll = (curSelected < blockItems.length);
            for (var i = 0; i < blockItems.length; i++) {
                blockItems[i].isSelected = selectAll;
                updateListBoxRow(i, true);
            }
            refreshListBoxRows();
            loadSelectedBlockToInspector();
            if (selectAll) {
                statusText.text = "ステータス : 全 " + blockItems.length + " ユニットを選択しました";
            } else {
                statusText.text = "ステータス : 全ユニットの選択を解除しました";
            }
        };

        btnAllPoint.onClick = function () {
            if (blockItems.length === 0 || isDirtyLocked) return;
            var currentSettings = syncSettingsFromUI();
            var sel = getSelectedUnitIndices();
            var targets = (sel.length > 0) ? sel : [];
            if (targets.length === 0) {
                for (var a = 0; a < blockItems.length; a++) targets.push(a);
            }
            for (var i = 0; i < targets.length; i++) {
                var idx = targets[i];
                PlaceTextParser.applyTypeDefaults(blockItems[idx], "point", currentSettings);
                blockItems[idx].isCustomized = true;
                blockItems[idx].customProps = blockItems[idx].customProps || {};
                blockItems[idx].customProps.type = true;
                updateListBoxRow(idx, true);
            }
            refreshListBoxRows();
            loadSelectedBlockToInspector();
            statusText.text = "ステータス : " + (sel.length > 0 ? "選択中の " + targets.length + " ユニット" : "全 " + blockItems.length + " ユニット") + "を「ポイント文字」に一括変更しました";
        };

        btnAllArea.onClick = function () {
            if (blockItems.length === 0 || isDirtyLocked) return;
            var currentSettings = syncSettingsFromUI();
            var sel = getSelectedUnitIndices();
            var targets = (sel.length > 0) ? sel : [];
            if (targets.length === 0) {
                for (var a = 0; a < blockItems.length; a++) targets.push(a);
            }
            for (var i = 0; i < targets.length; i++) {
                var idx = targets[i];
                PlaceTextParser.applyTypeDefaults(blockItems[idx], "area", currentSettings);
                blockItems[idx].isCustomized = true;
                blockItems[idx].customProps = blockItems[idx].customProps || {};
                blockItems[idx].customProps.type = true;
                updateListBoxRow(idx, true);
            }
            refreshListBoxRows();
            loadSelectedBlockToInspector();
            statusText.text = "ステータス : " + (sel.length > 0 ? "選択中の " + targets.length + " ユニット" : "全 " + blockItems.length + " ユニット") + "を「エリア内文字」に一括変更しました";
        };

        btnExportSettings.onClick = function () {
            try {
                var curSettings = syncSettingsFromUI();
                var f = File.saveDialog("PlaceText 設定ファイルの保存先を指定してください", "JSON:*.json");
                if (f) {
                    var ok = PlaceTextConfig.exportSettingsToFile(curSettings, f);
                    if (ok) {
                        alert("設定ファイルを保存しました:\n" + f.fsName, "PlaceText - 設定保存");
                    } else {
                        alert("設定ファイルの保存に失敗しました。", "PlaceText - エラー");
                    }
                }
            } catch (err) {
                PlaceTextErrors.showAlert(PlaceTextErrors.CODES.FILE_IO_FAILED, err.message, err.line);
            }
        };

        btnImportSettings.onClick = function () {
            try {
                var f = File.openDialog("読み込む PlaceText 設定ファイルを選択してください", "JSON:*.json");
                if (f) {
                    var loaded = PlaceTextConfig.importSettingsFromFile(f);
                    if (loaded) {
                        settings = loaded;
                        applySettingsToUI(settings);
                        markSettingsDirty();
                        alert("設定ファイルを読み込みました:\n" + f.fsName, "PlaceText - 設定読込");
                    } else {
                        alert("設定ファイルの読み込みまたは解析に失敗しました。", "PlaceText - エラー");
                    }
                }
            } catch (err) {
                PlaceTextErrors.showAlert(PlaceTextErrors.CODES.FILE_IO_FAILED, err.message, err.line);
            }
        };

        btnResetSettings.onClick = function () {
            try {
                if (confirm("すべての標準設定を初期値にリセットしますか？\n（現在の入力内容は保持されます）", false, "PlaceText - 設定リセット")) {
                    settings = PlaceTextConfig.resetSettings();
                    applySettingsToUI(settings);
                    markSettingsDirty();
                    alert("標準設定を初期値にリセットしました。", "PlaceText - 設定リセット");
                }
            } catch (err) {
                PlaceTextErrors.showAlert(PlaceTextErrors.CODES.UNKNOWN_ERROR, err.message, err.line);
            }
        };

        // ListBox 選択変更・クリック・キーボード操作（チェックボックス選択のみ）
        var lastClickTime = 0;
        var lastClickIndex = -1;
        var isHandlingClick = false;
        var isKeyboardNavigating = false;
        var lastKeyboardNavTime = 0;

        /**
         * ユニット行クリック時の即時トグル・更新ハンドラ
         * @param {number} idx - クリックされた行インデックス
         * @param {boolean} [forceToggle] - デバウンスを無視して強制トグルするか (Spaceキー等用)
         */
        function handleUnitItemClick(idx, forceToggle) {
            if (isHandlingClick || isUpdatingInspector || isRefreshingListBox || isDirtyLocked) return;
            if (typeof idx !== "number" || idx < 0 || idx >= blockItems.length) return;

            var now = new Date().getTime();
            // 同一クリック操作に伴うイベント重複（onChange / click / mouseup の同時発火）を80ms窓で抑止
            if (!forceToggle && idx === lastClickIndex && (now - lastClickTime < 80)) {
                return;
            }
            lastClickTime = now;
            lastClickIndex = idx;

            isHandlingClick = true;
            try {
                blockItems[idx].isSelected = !blockItems[idx].isSelected;
                selectedBlockIndex = idx;
                updateListBoxRow(idx);
                loadSelectedBlockToInspector();

                var selCount = getSelectedUnitIndices().length;
                statusText.text = "ステータス : ユニット #" + (idx + 1) + " を" + (blockItems[idx].isSelected ? "選択 [ ✓ ]" : "解除 [ ]") + "しました (" + selCount + " 件 選択中)";
            } finally {
                isHandlingClick = false;
            }
        }

        // 行選択変更 (マウスによる行クリック、またはキーボード上下移動)
        blockList.onChange = function () {
            if (isUpdatingInspector || isRefreshingListBox) return;
            if (!blockList.selection) {
                return;
            }

            var idx = blockList.selection.index;
            if (typeof idx !== "number" || idx < 0 || idx >= blockItems.length) return;

            var now = new Date().getTime();
            // 直近300ms以内にキーボードナビゲーションキーが押されていた場合は、チェック状態を変えずインスペクタのみ更新
            if (isKeyboardNavigating && (now - lastKeyboardNavTime < 300)) {
                selectedBlockIndex = idx;
                loadSelectedBlockToInspector();
                return;
            }

            // マウスクリックによる選択変更：クリックされた行のチェックボックスを即時トグル・更新
            handleUnitItemClick(idx, false);
        };

        // マウスクリック / マウスアップ（同一行の再クリックを捕捉して即時トグル）
        try {
            var handleMouseClickOnList = function (ev) {
                if (isDirtyLocked || isRefreshingListBox || !blockList.selection) return;
                var idx = blockList.selection.index;
                if (typeof idx === "number" && idx >= 0 && idx < blockItems.length) {
                    handleUnitItemClick(idx, false);
                }
            };
            blockList.addEventListener("click", handleMouseClickOnList);
            blockList.addEventListener("mouseup", handleMouseClickOnList);
        } catch (e) {}

        // 連続クリック時にOSがダブルクリックイベントを発火した場合もチェックボックスのトグルのみを行う
        blockList.onDoubleClick = function () {
            if (isDirtyLocked || isRefreshingListBox || !blockList.selection) return;
            var idx = blockList.selection.index;
            if (typeof idx === "number" && idx >= 0 && idx < blockItems.length) {
                handleUnitItemClick(idx, false);
            }
        };

        // キーボード操作 (矢印キー追跡 & Spaceキーによるトグル)
        try {
            blockList.addEventListener("keydown", function (ev) {
                if (!ev || isDirtyLocked) return;
                var k = ev.keyName ? String(ev.keyName).toUpperCase() : "";
                var now = new Date().getTime();

                if (k === "UP" || k === "DOWN" || k === "PAGEUP" || k === "PAGEDOWN" || k === "HOME" || k === "END") {
                    isKeyboardNavigating = true;
                    lastKeyboardNavTime = now;
                } else if (k === "SPACE") {
                    if (ev.preventDefault) ev.preventDefault();
                    if (ev.stopPropagation) ev.stopPropagation();
                    var targetIdx = (blockList.selection) ? blockList.selection.index : selectedBlockIndex;
                    if (typeof targetIdx === "number" && targetIdx >= 0 && targetIdx < blockItems.length) {
                        handleUnitItemClick(targetIdx, true);
                    }
                }
            });
        } catch (e) {}

        // ユニット操作ツールバーボタン
        btnRemoveBlock.onClick = function () {
            var targets = getSelectedUnitIndices();
            if (targets.length === 0) {
                statusText.text = "ステータス : 削除するユニットにチェックを入れて選択してください";
                return;
            }

            var isCsvCellMode = (settings.formatType === "csv" && settings.useFormatSplit !== false && settings.csvSplitMode === "cell");
            if (isSelectionMode || isCsvCellMode) {
                for (var t = 0; t < targets.length; t++) {
                    var idx = targets[t];
                    var item = blockItems[idx];
                    item.isDeleted = !item.isDeleted;
                    item.isCustomized = true;
                    item.customProps = item.customProps || {};
                    item.customProps.isDeleted = true;
                    updateListBoxRow(idx, true);
                }
                refreshListBoxRows();
                loadSelectedBlockToInspector();
                statusText.text = "ステータス : " + targets.length + " ユニットの削除マーク状態を切り替えました";
            } else {
                var toRemove = targets.slice().sort(function (a, b) { return b - a; });
                for (var r = 0; r < toRemove.length; r++) {
                    blockItems.splice(toRemove[r], 1);
                }
                selectedBlockIndex = -1;
                rebuildBlockListUI(-1);
                statusText.text = "ステータス : " + targets.length + " ユニットを削除しました (残り " + blockItems.length + " ユニット)";
            }
        };

        btnMergeUp.onClick = function () {
            var sel = getSelectedUnitIndices();
            if (sel.length === 0) {
                statusText.text = "ステータス : 結合するユニットにチェックを入れて選択してください";
                return;
            }
            var activeIdx = sel[0];
            if (activeIdx <= 0 || activeIdx >= blockItems.length) return;
            if (isSelectionMode) {
                alert("選択オブジェクト更新モードではユニット結合は行えません。", "PlaceText");
                return;
            }
            var currentSettings = syncSettingsFromUI();
            var prevIdx = activeIdx - 1;
            var prevItem = blockItems[prevIdx];
            var currItem = blockItems[activeIdx];
            prevItem.text = PlaceTextParser.cleanText(prevItem.text + "\n\n" + currItem.text);
            prevItem.isSelected = true;
            // 結合後に文字数閾値を超えた場合はエリア内文字へ自動昇格
            if (prevItem.type === "point" && PlaceTextParser.inferBlockType(prevItem.text, currentSettings) === "area") {
                PlaceTextParser.applyTypeDefaults(prevItem, "area", currentSettings);
            }
            blockItems.splice(activeIdx, 1);
            rebuildBlockListUI(prevIdx);
            statusText.text = "ステータス : ユニット #" + (prevIdx + 1) + " に結合しました";
        };

        btnMoveUp.onClick = function () {
            var sel = getSelectedUnitIndices();
            if (sel.length === 0) {
                statusText.text = "ステータス : 移動するユニットにチェックを入れて選択してください";
                return;
            }
            var activeIdx = sel[0];
            if (activeIdx <= 0 || activeIdx >= blockItems.length) return;
            var targetIdx = activeIdx - 1;
            var tmp = blockItems[targetIdx];
            blockItems[targetIdx] = blockItems[activeIdx];
            blockItems[activeIdx] = tmp;
            if (isSelectionMode && selectionSourceFrames.length === blockItems.length) {
                var tmpF = selectionSourceFrames[targetIdx];
                selectionSourceFrames[targetIdx] = selectionSourceFrames[activeIdx];
                selectionSourceFrames[activeIdx] = tmpF;
            }
            rebuildBlockListUI(targetIdx);
            statusText.text = "ステータス : ユニットを1つ上へ移動しました";
        };

        btnMoveDown.onClick = function () {
            var sel = getSelectedUnitIndices();
            if (sel.length === 0) {
                statusText.text = "ステータス : 移動するユニットにチェックを入れて選択してください";
                return;
            }
            var activeIdx = sel[0];
            if (activeIdx < 0 || activeIdx >= blockItems.length - 1) return;
            var targetIdx = activeIdx + 1;
            var tmp = blockItems[targetIdx];
            blockItems[targetIdx] = blockItems[activeIdx];
            blockItems[activeIdx] = tmp;
            if (isSelectionMode && selectionSourceFrames.length === blockItems.length) {
                var tmpF2 = selectionSourceFrames[targetIdx];
                selectionSourceFrames[targetIdx] = selectionSourceFrames[activeIdx];
                selectionSourceFrames[activeIdx] = tmpF2;
            }
            rebuildBlockListUI(targetIdx);
            statusText.text = "ステータス : ユニットを1つ下へ移動しました";
        };

        // インスペクタでの個別・一括メタデータ編集イベント
        function setInspectorType(newType) {
            if (isUpdatingInspector || isSelectionMode) return;
            var targets = getTargetIndices();
            if (targets.length === 0) return;
            var currentSettings = syncSettingsFromUI();
            var isArea = (newType === "area");
            for (var t = 0; t < targets.length; t++) {
                var idx = targets[t];
                PlaceTextParser.applyTypeDefaults(blockItems[idx], newType, currentSettings);
                blockItems[idx].isCustomized = true;
                blockItems[idx].customProps = blockItems[idx].customProps || {};
                blockItems[idx].customProps.type = true;
                updateListBoxRow(idx, true);
            }
            var allowAreaFrameEdit = isArea && !isSelectionMode;
            metaRow3.enabled = allowAreaFrameEdit;
            lblLineLength.enabled = allowAreaFrameEdit;
            editLineLength.enabled = allowAreaFrameEdit;
            dropLineLengthUnit.enabled = allowAreaFrameEdit;
            lblLineCount.enabled = allowAreaFrameEdit;
            editLineCount.enabled = allowAreaFrameEdit;
            dropLineCountUnit.enabled = allowAreaFrameEdit;
            lblBlockVJust.enabled = allowAreaFrameEdit;
            dropBlockVJust.enabled = allowAreaFrameEdit;
            refreshListBoxRows();
            if (targets.length > 1) {
                statusText.text = "ステータス : 選択中の " + targets.length + " ユニットを「" + (isArea ? "エリア内文字" : "ポイント文字") + "」に変更しました";
            }
        }

        radTypePoint.onClick = function () {
            setInspectorType("point");
        };

        radTypeArea.onClick = function () {
            setInspectorType("area");
        };

        function setInspectorOrientation(newOrient) {
            if (isUpdatingInspector || isSelectionMode) return;
            var targets = getTargetIndices();
            if (targets.length === 0) return;
            var isVert = (newOrient === "vertical");
            for (var t = 0; t < targets.length; t++) {
                var idx = targets[t];
                blockItems[idx].orientation = newOrient;
                blockItems[idx].isCustomized = true;
                blockItems[idx].customProps = blockItems[idx].customProps || {};
                blockItems[idx].customProps.orientation = true;
                updateListBoxRow(idx, true);
            }
            updateAlignmentDropdownLabels(isVert);
            refreshListBoxRows();
            if (targets.length > 1) {
                statusText.text = "ステータス : 選択中の " + targets.length + " ユニットの組み方向を「" + (isVert ? "縦書き" : "横書き") + "」に変更しました";
            }
        }

        radOrientH.onClick = function () {
            setInspectorOrientation("horizontal");
        };

        radOrientV.onClick = function () {
            setInspectorOrientation("vertical");
        };

        editBlockSize.onChanging = function () {
            if (isUpdatingInspector) return;
            var targets = getTargetIndices();
            if (targets.length === 0) return;
            var val = parseFloat(editBlockSize.text);
            if (!isNaN(val) && val > 0) {
                for (var t = 0; t < targets.length; t++) {
                    var bIdx = targets[t];
                    blockItems[bIdx].sizeVal = val;
                    PlaceTextParser.syncBlockItemPt(blockItems[bIdx]);
                    blockItems[bIdx].isCustomized = true;
                    blockItems[bIdx].customProps = blockItems[bIdx].customProps || {};
                    blockItems[bIdx].customProps.sizeVal = true;
                    updateListBoxRow(bIdx, true);
                }
                refreshListBoxRows();
            }
        };

        dropBlockSizeUnit.onChange = function () {
            if (isUpdatingInspector) return;
            var targets = getTargetIndices();
            if (targets.length === 0) return;
            var u = dropBlockSizeUnit.selection ? dropBlockSizeUnit.selection.text : "pt";
            for (var t = 0; t < targets.length; t++) {
                var bIdx = targets[t];
                blockItems[bIdx].sizeUnit = u;
                PlaceTextParser.syncBlockItemPt(blockItems[bIdx]);
                blockItems[bIdx].isCustomized = true;
                blockItems[bIdx].customProps = blockItems[bIdx].customProps || {};
                blockItems[bIdx].customProps.sizeUnit = true;
                blockItems[bIdx].customProps.sizeVal = true;
                updateListBoxRow(bIdx, true);
            }
            refreshListBoxRows();
            if (targets.length > 1) {
                statusText.text = "ステータス : 選択中の " + targets.length + " ユニットの文字サイズ単位を変更しました";
            }
        };

        dropBlockJust.onChange = function () {
            if (isUpdatingInspector) return;
            var targets = getTargetIndices();
            if (targets.length === 0) return;
            var idx = dropBlockJust.selection ? dropBlockJust.selection.index : 0;
            var just = "left";
            if (idx === 1) just = "center";
            else if (idx === 2) just = "right";
            else if (idx === 3) just = "justify";
            for (var t = 0; t < targets.length; t++) {
                var bIdx = targets[t];
                blockItems[bIdx].justification = just;
                blockItems[bIdx].isCustomized = true;
                blockItems[bIdx].customProps = blockItems[bIdx].customProps || {};
                blockItems[bIdx].customProps.justification = true;
                updateListBoxRow(bIdx, true);
            }
            refreshListBoxRows();
            if (targets.length > 1) {
                statusText.text = "ステータス : 選択中の " + targets.length + " ユニットの文字揃えを変更しました";
            }
        };

        editLineLength.onChanging = function () {
            if (isUpdatingInspector) return;
            var targets = getTargetIndices();
            if (targets.length === 0) return;
            var val = parseFloat(editLineLength.text);
            if (!isNaN(val) && val > 0) {
                for (var t = 0; t < targets.length; t++) {
                    var bIdx = targets[t];
                    blockItems[bIdx].lineLengthVal = val;
                    PlaceTextParser.syncBlockItemPt(blockItems[bIdx]);
                    blockItems[bIdx].isCustomized = true;
                    blockItems[bIdx].customProps = blockItems[bIdx].customProps || {};
                    blockItems[bIdx].customProps.lineLengthVal = true;
                    blockItems[bIdx].customProps.widthVal = true;
                    updateListBoxRow(bIdx, true);
                }
                refreshListBoxRows();
            }
        };

        dropLineLengthUnit.onChange = function () {
            if (isUpdatingInspector) return;
            var targets = getTargetIndices();
            if (targets.length === 0) return;
            var u = dropLineLengthUnit.selection ? dropLineLengthUnit.selection.text : "pt";
            for (var t = 0; t < targets.length; t++) {
                var bIdx = targets[t];
                blockItems[bIdx].lineLengthUnit = u;
                blockItems[bIdx].widthUnit = u;
                PlaceTextParser.syncBlockItemPt(blockItems[bIdx]);
                blockItems[bIdx].isCustomized = true;
                blockItems[bIdx].customProps = blockItems[bIdx].customProps || {};
                blockItems[bIdx].customProps.lineLengthUnit = true;
                blockItems[bIdx].customProps.widthUnit = true;
                updateListBoxRow(bIdx, true);
            }
            refreshListBoxRows();
            if (targets.length > 1) {
                statusText.text = "ステータス : 選択中の " + targets.length + " ユニットの行長単位を変更しました";
            }
        };

        editLineCount.onChanging = function () {
            if (isUpdatingInspector) return;
            var targets = getTargetIndices();
            if (targets.length === 0) return;
            var val = parseFloat(editLineCount.text);
            if (!isNaN(val) && val >= 0) {
                for (var t = 0; t < targets.length; t++) {
                    var bIdx = targets[t];
                    blockItems[bIdx].lineCountVal = val;
                    PlaceTextParser.syncBlockItemPt(blockItems[bIdx]);
                    blockItems[bIdx].isCustomized = true;
                    blockItems[bIdx].customProps = blockItems[bIdx].customProps || {};
                    blockItems[bIdx].customProps.lineCountVal = true;
                    blockItems[bIdx].customProps.heightVal = true;
                    updateListBoxRow(bIdx, true);
                }
                refreshListBoxRows();
            }
        };

        dropLineCountUnit.onChange = function () {
            if (isUpdatingInspector) return;
            var targets = getTargetIndices();
            if (targets.length === 0) return;
            var u = dropLineCountUnit.selection ? dropLineCountUnit.selection.text : "行";
            for (var t = 0; t < targets.length; t++) {
                var bIdx = targets[t];
                blockItems[bIdx].lineCountUnit = u;
                if (u !== "行") {
                    blockItems[bIdx].heightUnit = u;
                }
                PlaceTextParser.syncBlockItemPt(blockItems[bIdx]);
                blockItems[bIdx].isCustomized = true;
                blockItems[bIdx].customProps = blockItems[bIdx].customProps || {};
                blockItems[bIdx].customProps.lineCountUnit = true;
                blockItems[bIdx].customProps.heightUnit = true;
                updateListBoxRow(bIdx, true);
            }
            refreshListBoxRows();
            if (targets.length > 1) {
                statusText.text = "ステータス : 選択中の " + targets.length + " ユニットの行数単位を変更しました";
            }
        };

        dropBlockVJust.onChange = function () {
            if (isUpdatingInspector) return;
            var targets = getTargetIndices();
            if (targets.length === 0) return;
            var idx = dropBlockVJust.selection ? dropBlockVJust.selection.index : 0;
            var vjust = "top";
            if (idx === 1) vjust = "center";
            else if (idx === 2) vjust = "bottom";
            else if (idx === 3) vjust = "justify";
            for (var t = 0; t < targets.length; t++) {
                var bIdx = targets[t];
                blockItems[bIdx].verticalJustification = vjust;
                blockItems[bIdx].isCustomized = true;
                blockItems[bIdx].customProps = blockItems[bIdx].customProps || {};
                blockItems[bIdx].customProps.verticalJustification = true;
                updateListBoxRow(bIdx, true);
            }
            refreshListBoxRows();
            if (targets.length > 1) {
                statusText.text = "ステータス : 選択中の " + targets.length + " ユニットの行配置を変更しました";
            }
        };

        editBlockText.onChanging = function () {
            if (isUpdatingInspector || selectedBlockIndex < 0 || selectedBlockIndex >= blockItems.length) return;
            var sel = getSelectedUnitIndices();
            if (sel.length > 1) return;
            var targetIdx = (sel.length === 1) ? sel[0] : selectedBlockIndex;
            var raw = editBlockText.text || "";
            if (isEscapedMode) {
                raw = PlaceTextParser.unescapeControlChars(raw);
            }
            blockItems[targetIdx].text = PlaceTextParser.cleanText(raw);
            updateListBoxRow(targetIdx);
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
            var hasNonEmpty = false;
            for (var i = 0; i < blockItems.length; i++) {
                var itm = blockItems[i];
                if (!itm) continue;
                var hasTxt = !!(itm.text && itm.text.replace(/\s+/g, "").length > 0);
                if (hasTxt && !itm.isDeleted) {
                    hasNonEmpty = true;
                }
                if (hasTxt || itm.csvSplitMode === "cell") {
                    PlaceTextParser.syncBlockItemPt(itm);
                    validItems.push(itm);
                }
            }
            if (!hasNonEmpty) return [];
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

            // 2. ボタンバーの切り替えとステータス表示の撤廃
            statusText.visible = false;
            normalActionBtns.visible = false;
            previewActionBtns.visible = true;

            win.text = PlaceTextConfig.APP_NAME + " v" + PlaceTextConfig.APP_VERSION + " - プレビュー確認中";

            // 3. ウィンドウを最小限サイズ（幅360px × 高さ90px）へリサイズ
            win.layout.layout(true);
            win.size = [360, 90];
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

            // 2. ボタンバーの切り替えとステータス再表示
            statusText.visible = true;
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

            // 6. ロック状態のUI活性・非活性を再適用
            setDirtyLock(isDirtyLocked);
        }

        /**
         * 配置・レイアウト設定モーダルダイアログ (PlaceText_GUI.md 準拠)
         * @param {Object} curSettings 現在の設定オブジェクト
         * @param {Function} [onApply] 設定適用時のコールバック
         */
        function showLayoutSettingsDialog(curSettings, onApply) {
            var isCsvLocked = (curSettings.formatType === "csv" && curSettings.useFormatSplit !== false);
            if (isCsvLocked) {
                syncCsvLayoutSettings(curSettings, blockItems);
            }

            var dlg = new Window("dialog", "配置・レイアウト設定");
            dlg.orientation = "column";
            dlg.alignChildren = ["fill", "top"];
            dlg.spacing = 10;
            dlg.margins = 15;

            // パネル 1 : 並び順・レイアウト
            var pnlMode = dlg.add("panel", undefined, "並び順・レイアウト");
            pnlMode.orientation = "column";
            pnlMode.alignChildren = "fill";
            pnlMode.spacing = 8;
            pnlMode.margins = [10, 12, 10, 10];

            var rowModeSel = pnlMode.add("group");
            rowModeSel.orientation = "row";
            rowModeSel.alignChildren = ["left", "center"];
            rowModeSel.spacing = 6;
            rowModeSel.add("statictext", undefined, "配置形式 :");
            var dropLayoutMode = rowModeSel.add("dropdownlist", undefined, [
                "縦1列",
                "横1列",
                "グリッド (列数指定)",
                "グリッド (行数指定)"
            ]);
            dropLayoutMode.preferredSize = [180, 22];

            var curMode = curSettings.layoutMode || "stack_v";
            var modeIdx = 0;
            if (curMode === "stack_h") modeIdx = 1;
            else if (curMode === "grid_col") modeIdx = 2;
            else if (curMode === "grid_row") modeIdx = 3;
            dropLayoutMode.selection = modeIdx;

            var tempGridCols = curSettings.gridColumns || 3;
            var tempGridRows = curSettings.gridRows || 3;

            // 列数 / 行数 入力行 (グリッド選択時のみ有効)
            var rowGridParams = pnlMode.add("group");
            rowGridParams.orientation = "row";
            rowGridParams.alignChildren = ["left", "center"];
            rowGridParams.spacing = 8;

            var lblGridCount = rowGridParams.add("statictext", undefined, "列数 / 行数 :");
            var initialGridVal = (modeIdx === 3) ? tempGridRows : tempGridCols;
            var editGridCount = rowGridParams.add("edittext", undefined, String(initialGridVal));
            editGridCount.characters = 4;
            editGridCount.justify = "right";

            if (isCsvLocked) {
                pnlMode.enabled = false;
                dropLayoutMode.enabled = false;
                lblGridCount.enabled = false;
                editGridCount.enabled = false;
            }

            // パネル 2 : オブジェクト間隔
            var pnlSpacing = dlg.add("panel", undefined, "オブジェクト間隔");
            pnlSpacing.orientation = "column";
            pnlSpacing.alignChildren = "fill";
            pnlSpacing.spacing = 6;
            pnlSpacing.margins = [10, 12, 10, 10];

            var rowSpacing1 = pnlSpacing.add("group");
            rowSpacing1.orientation = "row";
            rowSpacing1.alignChildren = ["left", "center"];
            rowSpacing1.spacing = 6;
            rowSpacing1.add("statictext", undefined, "行間隔 :");
            var editRowSpacing = rowSpacing1.add("edittext", undefined, String(curSettings.rowSpacing !== undefined ? curSettings.rowSpacing : (curSettings.spacing || 20)));
            editRowSpacing.characters = 5;
            editRowSpacing.justify = "right";
            var dropRowSpacingUnit = rowSpacing1.add("dropdownlist", undefined, ["pt", "mm", "px"]);
            dropRowSpacingUnit.preferredSize = [55, 22];
            var rUnitIdx = 0;
            if (curSettings.spacingUnit === "mm") rUnitIdx = 1;
            else if (curSettings.spacingUnit === "px") rUnitIdx = 2;
            dropRowSpacingUnit.selection = rUnitIdx;

            var rowSpacing2 = pnlSpacing.add("group");
            rowSpacing2.orientation = "row";
            rowSpacing2.alignChildren = ["left", "center"];
            rowSpacing2.spacing = 6;
            var lblColSpacing = rowSpacing2.add("statictext", undefined, "列間隔 :");
            var editColSpacing = rowSpacing2.add("edittext", undefined, String(curSettings.colSpacing !== undefined ? curSettings.colSpacing : (curSettings.spacing || 20)));
            editColSpacing.characters = 5;
            editColSpacing.justify = "right";

            var chkSameSpacing = pnlSpacing.add("checkbox", undefined, "行・列の間隔を同一にする");
            chkSameSpacing.value = (curSettings.sameSpacing !== false);

            var prevModeIdx = modeIdx;
            function updateLayoutDialogState() {
                var sIdx = dropLayoutMode.selection ? dropLayoutMode.selection.index : 0;
                if (prevModeIdx === 2) {
                    tempGridCols = parseInt(editGridCount.text, 10) || tempGridCols;
                } else if (prevModeIdx === 3) {
                    tempGridRows = parseInt(editGridCount.text, 10) || tempGridRows;
                }
                if (sIdx === 2 && prevModeIdx !== 2) {
                    editGridCount.text = String(tempGridCols);
                } else if (sIdx === 3 && prevModeIdx !== 3) {
                    editGridCount.text = String(tempGridRows);
                }
                prevModeIdx = sIdx;

                var isGrid = (sIdx === 2 || sIdx === 3);
                lblGridCount.enabled = isGrid && !isCsvLocked;
                editGridCount.enabled = isGrid && !isCsvLocked;

                var same = chkSameSpacing.value;
                var colEnabled = isGrid && !same;
                lblColSpacing.enabled = colEnabled;
                editColSpacing.enabled = colEnabled;
                if (same) {
                    editColSpacing.text = editRowSpacing.text;
                }
            }

            dropLayoutMode.onChange = updateLayoutDialogState;
            chkSameSpacing.onClick = updateLayoutDialogState;
            editRowSpacing.onChanging = function () {
                if (chkSameSpacing.value) {
                    editColSpacing.text = editRowSpacing.text;
                }
            };
            updateLayoutDialogState();

            // パネル 3 : 配置基準位置
            var pnlBase = dlg.add("panel", undefined, "配置基準位置");
            pnlBase.orientation = "row";
            pnlBase.alignChildren = ["left", "center"];
            pnlBase.spacing = 6;
            pnlBase.margins = [10, 12, 10, 10];
            var dropBase = pnlBase.add("dropdownlist", undefined, ["選択直下", "アートボード基準"]);
            dropBase.preferredSize = [180, 22];
            dropBase.selection = (curSettings.baseMode === "artboard") ? 1 : 0;

            // 下部ボタン
            var btnRow = dlg.add("group");
            btnRow.orientation = "row";
            btnRow.alignment = "right";
            btnRow.spacing = 8;
            var btnOk = btnRow.add("button", undefined, "OK", { name: "ok" });
            btnOk.preferredSize = [80, 26];
            var btnCancel = btnRow.add("button", undefined, "キャンセル", { name: "cancel" });
            btnCancel.preferredSize = [85, 26];

            btnOk.onClick = function () {
                if (!isCsvLocked) {
                    var sIdx = dropLayoutMode.selection ? dropLayoutMode.selection.index : 0;
                    var mode = "stack_v";
                    if (sIdx === 1) mode = "stack_h";
                    else if (sIdx === 2) mode = "grid_col";
                    else if (sIdx === 3) mode = "grid_row";
                    curSettings.layoutMode = mode;

                    var countVal = parseInt(editGridCount.text, 10) || 3;
                    if (countVal < 1) countVal = 1;
                    if (sIdx === 2) {
                        curSettings.gridColumns = countVal;
                        curSettings.gridRows = tempGridRows;
                    } else if (sIdx === 3) {
                        curSettings.gridRows = countVal;
                        curSettings.gridColumns = tempGridCols;
                    } else {
                        curSettings.gridColumns = tempGridCols;
                        curSettings.gridRows = tempGridRows;
                    }
                } else {
                    syncCsvLayoutSettings(curSettings, blockItems);
                }

                var rSp = parseFloat(editRowSpacing.text);
                curSettings.rowSpacing = !isNaN(rSp) ? rSp : 20;
                curSettings.spacing = curSettings.rowSpacing;

                var cSp = parseFloat(editColSpacing.text);
                curSettings.colSpacing = chkSameSpacing.value ? curSettings.rowSpacing : (!isNaN(cSp) ? cSp : curSettings.rowSpacing);

                curSettings.sameSpacing = chkSameSpacing.value;

                var spUnit = dropRowSpacingUnit.selection ? dropRowSpacingUnit.selection.text : "pt";
                curSettings.spacingUnit = spUnit;
                curSettings.rowSpacingUnit = spUnit;
                curSettings.colSpacingUnit = spUnit;

                curSettings.baseMode = (dropBase.selection && dropBase.selection.index === 1) ? "artboard" : "selection";

                PlaceTextConfig.saveSettings(curSettings);
                if (typeof onApply === "function") {
                    onApply(curSettings);
                }
                dlg.close(1);
            };

            btnCancel.onClick = function () {
                dlg.close(0);
            };

            dlg.center();
            dlg.show();
        }

        btnLayoutSettings.onClick = function () {
            try {
                var curSettings = syncSettingsFromUI();
                showLayoutSettingsDialog(curSettings, function (newSettings) {
                    var prevDirty = isDirtyLocked;
                    settings = newSettings;
                    // 配置設定は分割結果に影響しないため、変更前のロック状態を維持
                    setDirtyLock(prevDirty);
                    statusText.text = "ステータス : 配置設定を更新しました (方式: " + settings.layoutMode + ")";
                });
            } catch (err) {
                PlaceTextErrors.showAlert(PlaceTextErrors.CODES.UNKNOWN_ERROR, err.message, err.line);
            }
        };

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
                if (isSelectionMode && selectionSourceFrames && selectionSourceFrames.length > 0) {
                    PlaceTextLayout.updateSelectedFrames(selectionSourceFrames, blockItems, currentSettings);
                    win.close(1);
                } else {
                    var created = PlaceTextLayout.createStackLayout(doc, items, currentSettings, false);
                    win.close(1);
                }
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
