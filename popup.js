(function(undefined) {
  var bgPage = chrome.extension.getBackgroundPage();
  var twitter = bgPage.getTwitterAPI();

  var loginFormElement = document.querySelector("#twitter-login");
  loginFormElement.addEventListener("click", function() {
    twitter.login();
  });

  if (twitter.isAuthenticated()) {
    var root = document.querySelector("#content");

    twitter.fetchTimelines(root);
  } else {
    loginFormElement.style.display = "block";
  }
})();
