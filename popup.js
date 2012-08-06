(function(undefined) {
  var loginFormElement = document.querySelector("#twitter-login");

  var bgPage = chrome.extension.getBackgroundPage();
  var twitter = bgPage.getTwitterAPI();

  if (twitter.isAuthenticated()) {
    var root = document.querySelector("#content");
    root.removeChild(loginFormElement);

    twitter.fetchTimelines(root);
  } else {
    loginFormElement.addEventListener("click", function() {
      twitter.login();
    });
  }
})();
