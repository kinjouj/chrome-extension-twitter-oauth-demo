(function(undefined) {
  var bgPage = chrome.extension.getBackgroundPage();
  var twitter = bgPage.getTwitterAPI();

  if (twitter.isAuthenticated()) {
    $('#twitter-login').remove();

    var contentRoot = $('#content');

    twitter.fetchTimelines(function(tweets) {
      tweets.forEach(function(tweet) {
        contentRoot.append(
          $('<div>').attr('class', 'tweet').append(
            $('<span>').append(
              $('<a>').attr(
                'href',
                'http://twitter.com/' + tweet.user.screen_name
              ).text('@' + tweet.user.name)
            ),
            $('<div>').text(tweet.text)
          )
        );
      });
    });
  } else {
    $('#twitter-login > a').click(function() { twitter.login() });
  }
})();
