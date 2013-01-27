var api = null;

function getTwitterAPI() {
  if (api === null) {
    api = new Twitter();
  }

  return api;
}

chrome.extension.onRequest.addListener(function(req, sender, res) {
  getTwitterAPI().sign(req.verifier, res);
});
