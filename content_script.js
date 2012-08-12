if (document.referrer.match(/oauth_consumer_key=([^&]+)/)) {
  if (RegExp.$1 === CONSUMER_KEY) {
    var pin = prompt("表示されているPINコードを入力してください");

    chrome.extension.sendRequest({ "verifier": pin }, function(isSuccess) {
      if (isSuccess === true) {
        alert("認証完了");
      }
    });
  }
}
