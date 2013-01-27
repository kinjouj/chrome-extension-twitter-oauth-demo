const TWITTER_USER_ID_STORAGE_KEY = "userid";

var Twitter = function() {};

Twitter.prototype.getAccessToken = function() {
  var accessToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);

  return _.isString(accessToken) ? accessToken : null;
};

Twitter.prototype.getAccessTokenSecret = function() {
  var accessTokenSecret = localStorage.getItem(ACCESS_TOKEN_SECRET_STORAGE_KEY);

  return _.isString(accessTokenSecret) ? accessTokenSecret : null;
};

Twitter.prototype.getUserID = function() {
  var userid = Number(localStorage.getItem(TWITTER_USER_ID_STORAGE_KEY));

  return (_.isNumber(userid) && !_.isNaN(userid)) ? userid : null;
};

Twitter.prototype.parseToken = function(data) {
  if (_.isString(data)) {
    var parsedToken = {};

    data.split('&').forEach(function(token) {
      var kv = token.split('=');

      parsedToken[kv[0]] = kv[1];
    });

    return parsedToken;
  }

  return null;
};

Twitter.prototype.login = function() {
  var message = {
    "method": "GET",
    "action": "https://api.twitter.com/oauth/request_token",
    "parameters": {
      "oauth_consumer_key": CONSUMER_KEY,
      "oauth_signature_method": "HMAC-SHA1"
    }
  };

  var accessor = {
    "consumerSecret": CONSUMER_SECRET
  };

  OAuth.setTimestampAndNonce(message);
  OAuth.SignatureMethod.sign(message, accessor);

  $.get(
    OAuth.addToURL(message.action, message.parameters),
    $.proxy(
      function(data) {
        var params = this.parseToken(data);
        var token = params.oauth_token;
        var secret = params.oauth_token_secret;

        message.action = "https://api.twitter.com/oauth/authorize";
        message.parameters.oauth_token = token;

        accessor.oauth_token_secret = secret;

        OAuth.setTimestampAndNonce(message);
        OAuth.SignatureMethod.sign(message, accessor);

        this.request_token = token;
        this.request_token_secret = secret;

        window.open(OAuth.addToURL(message.action, message.parameters));
      },
      this
    )
  );
};

Twitter.prototype.sign = function(pin, cb) {
  var requestToken = this.request_token;
  var requestTokenSecret = this.request_token_secret;

  delete this.request_token;
  delete this.request_token_secret;

  var message = {
    "method": "GET",
    "action": "https://api.twitter.com/oauth/access_token",
    "parameters": {
      "oauth_consumer_key": CONSUMER_KEY,
      "oauth_signature_method": "HMAC-SHA1",
      "oauth_token": requestToken,
      "oauth_verifier": pin
    }
  };

  var accessor = {
    "consumerSecret": CONSUMER_SECRET,
    "tokenSecret": requestTokenSecret
  };

  OAuth.setTimestampAndNonce(message);
  OAuth.SignatureMethod.sign(message, accessor);

  $.ajax({
    "type": "GET",
    "url": OAuth.addToURL(message.action, message.parameters),
    "success": $.proxy(function(data) {
      var params = this.parseToken(data);

      this.save(params.oauth_token, params.oauth_token_secret, params.user_id);

      cb(true);
    }, this),
    "error": function(xhr, status, error) {
      cb(false);
    }
  });
};

Twitter.prototype.save = function(accessToken, accessTokenSecret, userid) {
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  localStorage.setItem(ACCESS_TOKEN_SECRET_STORAGE_KEY, accessTokenSecret);
  localStorage.setItem(TWITTER_USER_ID_STORAGE_KEY, userid);
};

Twitter.prototype.isAuthenticated = function() {
  return !_.isNull(this.getAccessToken()) && !_.isNull(this.getAccessTokenSecret()) && _.isNumber(this.getUserID()) ? true : false;
};

Twitter.prototype.fetchTimelines = function(elm) {
  var message = {
    "method": "GET",
    "action": "https://api.twitter.com/1/statuses/home_timeline.json",
    "parameters": {
      "oauth_consumer_key": CONSUMER_KEY,
      "oauth_signature_method": "HMAC-SHA1",
      "oauth_token": this.getAccessToken(),
      "count": 100,
      "include_rts": true,
      "include_entities": true
    }
  };

  var accessor = {
    "consumerSecret": CONSUMER_SECRET,
    "tokenSecret": this.getAccessTokenSecret()
  };

  OAuth.setTimestampAndNonce(message);
  OAuth.SignatureMethod.sign(message, accessor);

  $.ajax({
    "type": "GET",
    "url": OAuth.addToURL(message.action, message.parameters),
    "dataType": "json",
    "success": function(tweets) {
      var root = $("<div>").attr("id", "tweets");

      tweets.forEach(function(tweet) {
        var retweeted = false;

        if (_.has(tweet, "retweeted_status")) {
          var entities = tweet.entities;
          var retweetUser = tweet.user;

          tweet = tweet.retweeted_status;
          tweet.entities = entities;
          tweet.retweet_user = retweetUser;

          retweeted = true;
        }

        var user = tweet.user;
        var source = $(tweet.source);

        if (_.isObject(source) && _.isElement(source[0])) {
          source.attr("target", "_blank");
        } else {
          source = $("<a>").attr("href", "javascript:void(0)").text(tweet.source);
        }

        var tweetView = $("<div>").attr("class", "tweet").append(
          $("<div>").attr("class", "tweet-icon").append(
            $("<img>").attr("src", user.profile_image_url_https)
          ),
          $("<div>").attr("class", "tweet-detail").append(
            $("<a>").attr(
              "href",
              "http://twitter.com/" + user.screen_name
            ).attr("target", "_blank").text(user.name),
            $("<pre>").html(normalizeTweetText(tweet))
          ),
          $("<div>").attr("class", "tweet-info").append(
            $("<ul>").append(
              $("<li>").append(source),
              $("<li>").append(
                $("<a>").attr(
                  "href",
                  "https://twitter.com/" + user.screen_name + "/status/" + tweet.id_str
                ).attr(
                  "target",
                  "_blank"
                ).text(normalizeDateTime(new Date(tweet.created_at)))
              )
            )
          )
        );

        if (retweeted) {
          tweetView.append(
            $("<div>").attr("class", "retweet-info").append(
              $("<span>").append(
                $("<i>").attr("class", "retweet-icon")
              ),
              $("<span>").css("color", "#336699").text("Retweeted by " + tweet.retweet_user.name)
            )
          );
        }

        tweetView.append($("<div>").attr("class", "clearfix"));

        root.append(tweetView);
      });

      elm.removeChild(elm.querySelector("#twitter-login"));

      $(elm).append(root);
    },
    "error": function(xhr, status, error) {
      if (xhr.status === 401) {
        localStorage.removeItem("access_token");

        $(elm.querySelector("#twitter-login")).css("display", "block");
      }
    }
  });
};

function normalizeTweetText(tweet) {
  if (_.isObject(tweet)) {
    var text = tweet.text;
    var entities = tweet.entities;

    if (_.isArray(entities.hashtags)) {
      entities.hashtags.forEach(function(hashtag) {
        text = text.replace(
          '#' + hashtag.text,
          '<a href="http://twitter.com/search/' + encodeURIComponent('#' + hashtag.text) + '" target="_blank">#' + hashtag.text + '</a>'
        );
      });
    }

    if (_.isArray(entities.media)) {
      entities.media.forEach(function(media) {
        text = text.replace(
          media.url,
          '<a href="' + media.media_url_https + '" target="_blank">' + media.url + '</a>'
        );
      });
    }

    if (_.isArray(entities.urls) > 0) {
      entities.urls.forEach(function(url) {
        text = text.replace(
          url.url,
          '<a href="' + url.expanded_url + '" target="_blank">' + url.expanded_url + '</a>'
        );
      });
    }

    if (_.isArray(entities.user_mentions)) {
      entities.user_mentions.forEach(function(mention) {
        text = text.replace(
          '@' + mention.screen_name,
          '<a href="https://twitter.com/' + mention.screen_name + '" target="_blank">@' + mention.screen_name + '</a>'
        );
      });
    }

    return text;
  } else {
    throw new Error("argument isn`t prototype of String");
  }
}

function normalizeDateTime(date) {
  if (_.isDate(date)) {
    return date.getFullYear() + "/" + zeroPadding(date.getMonth() + 1) + "/" + zeroPadding(date.getDate()) + " " + zeroPadding(date.getHours()) + ":" + zeroPadding(date.getMinutes()) + ":" + zeroPadding(date.getSeconds());
  } else {
    throw new Error("argument isn`t prototype of Date");
  }
}

function zeroPadding(n) {
  if (_.isNumber(n)) {
    if (String(n).length == 1) {
      return "0" + n;
    }
  }

  return n;
}
