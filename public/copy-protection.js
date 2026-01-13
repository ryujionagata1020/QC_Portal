/**
 * コピー・右クリック抑制機能
 * Chrome, Safari, Firefox, IE, Edge, 標準ブラウザ対応
 */

(function() {
  'use strict';

  // コンテキストメニュー(右クリック)を無効化
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
  }, false);

  // テキスト選択を無効化（追加の保護層）
  document.addEventListener('selectstart', function(e) {
    // 入力フィールドとテキストエリアは除外
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return true;
    }
    e.preventDefault();
    return false;
  }, false);

  // コピーを無効化
  document.addEventListener('copy', function(e) {
    // 入力フィールドとテキストエリアは除外
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return true;
    }
    e.preventDefault();
    return false;
  }, false);

  // カットを無効化
  document.addEventListener('cut', function(e) {
    // 入力フィールドとテキストエリアは除外
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return true;
    }
    e.preventDefault();
    return false;
  }, false);

  // ドラッグを無効化
  document.addEventListener('dragstart', function(e) {
    e.preventDefault();
    return false;
  }, false);

  // キーボードショートカットを無効化
  document.addEventListener('keydown', function(e) {
    // 入力フィールドとテキストエリアは除外
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return true;
    }

    // Ctrl/Command + C (コピー)
    if ((e.ctrlKey || e.metaKey) && e.keyCode === 67) {
      e.preventDefault();
      return false;
    }

    // Ctrl/Command + X (カット)
    if ((e.ctrlKey || e.metaKey) && e.keyCode === 88) {
      e.preventDefault();
      return false;
    }

    // Ctrl/Command + A (全選択)
    if ((e.ctrlKey || e.metaKey) && e.keyCode === 65) {
      e.preventDefault();
      return false;
    }

    // Ctrl/Command + U (ページのソース表示) - オプション
    if ((e.ctrlKey || e.metaKey) && e.keyCode === 85) {
      e.preventDefault();
      return false;
    }

    // Ctrl/Command + S (ページの保存) - オプション
    if ((e.ctrlKey || e.metaKey) && e.keyCode === 83) {
      e.preventDefault();
      return false;
    }

    // F12 (開発者ツール) - オプション
    if (e.keyCode === 123) {
      e.preventDefault();
      return false;
    }

    // Ctrl + Shift + I (開発者ツール) - オプション
    if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
      e.preventDefault();
      return false;
    }

    // Ctrl + Shift + J (コンソール) - オプション
    if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
      e.preventDefault();
      return false;
    }

    // Ctrl + Shift + C (要素の検証) - オプション
    if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
      e.preventDefault();
      return false;
    }
  }, false);

  // IE用の追加対応
  if (document.selection) {
    document.onselectstart = function() {
      if (event.srcElement.tagName === 'INPUT' || event.srcElement.tagName === 'TEXTAREA') {
        return true;
      }
      return false;
    };
  }

  // マウスダウンイベントでの選択防止（追加の保護層）
  document.addEventListener('mousedown', function(e) {
    // 入力フィールドとテキストエリアは除外
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return true;
    }
    // 右クリックまたは中クリックをブロック
    if (e.button === 2 || e.button === 1) {
      e.preventDefault();
      return false;
    }
  }, false);

  // 印刷防止（オプション）
  // window.addEventListener('beforeprint', function(e) {
  //   e.preventDefault();
  //   alert('印刷は禁止されています');
  //   return false;
  // }, false);

  // 画像の右クリック保存を防止
  var images = document.getElementsByTagName('img');
  for (var i = 0; i < images.length; i++) {
    images[i].addEventListener('contextmenu', function(e) {
      e.preventDefault();
      return false;
    }, false);

    // 画像のドラッグを防止
    images[i].addEventListener('dragstart', function(e) {
      e.preventDefault();
      return false;
    }, false);
  }

  // 動的に追加される画像にも適用
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length) {
        for (var i = 0; i < mutation.addedNodes.length; i++) {
          var node = mutation.addedNodes[i];
          if (node.tagName === 'IMG') {
            node.addEventListener('contextmenu', function(e) {
              e.preventDefault();
              return false;
            }, false);
            node.addEventListener('dragstart', function(e) {
              e.preventDefault();
              return false;
            }, false);
          }
        }
      }
    });
  });

  // bodyの変更を監視
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

})();
