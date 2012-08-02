var pin = document.querySelector('div#oauth_pin > p > kbd > code');

if ((pin !== undefined && pin !== null) && /^\d{7}$/.test(pin.innerText)) {
  chrome.extension.sendRequest({ "verifier": pin.innerText });

  if (confirm("ウィンドウ閉じますか?")) {
    window.close();
  }
}
