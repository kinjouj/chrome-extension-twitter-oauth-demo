var pin = prompt("表示されているPINコードを入力してください");

chrome.extension.sendRequest({ "verifier": pin });

if (confirm("ウィンドウ閉じますか?")) {
  window.close();
}
