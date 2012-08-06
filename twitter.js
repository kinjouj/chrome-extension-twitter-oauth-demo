const ACCESS_TOKEN_STORAGE_KEY = "access_token";
const ACCESS_TOKEN_SECRET_STORAGE_KEY = "access_token_secret";

const TWITTER_USER_ID_STORAGE_KEY = "userid";

var Twitter = function() {
  this.accessToken = this.getAccessToken();
  this.accessTokenSecret = this.getAccessTokenSecret();
  this.userid = this.getUserID();
};

Twitter.prototype.getAccessToken = function() {
  var accessToken = this.accessToken;

  if (_.isString(accessToken)) {
    return this.accessToken;
  } else {
    accessToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);

    if (_.isString(accessToken)) {
      this.accessToken = accessToken;

      return accessToken;
    }

    return null;
  }
};

Twitter.prototype.getAccessTokenSecret = function() {
  var accessTokenSecret = this.accessTokenSecret;

  if (_.isString(accessTokenSecret)) {
    return this.accessTokenSecret;
  } else {
    accessTokenSecret = localStorage.getItem(ACCESS_TOKEN_SECRET_STORAGE_KEY);

    if (_.isString(accessTokenSecret)) {
      this.accessTokenSecret = accessTokenSecret;

      return accessTokenSecret;
    }

    return null;
  }
};

Twitter.prototype.getUserID = function() {
  var userid = this.userid;

  if (_.isNumber(userid) && !_.isNaN(userid)) {
    return userid;
  } else {
    var userid = Number(localStorage.getItem(TWITTER_USER_ID_STORAGE_KEY));

    if (_.isNumber(userid) && !_.isNaN(userid)) {
      this.userid = userid;

      return userid;
    }

    return null;
  }
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

  return undefined;
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
    $.proxy(function(data) {
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
    }, this)
  );
};

Twitter.prototype.sign = function(pin) {
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

  $.get(
    OAuth.addToURL(message.action, message.parameters),
    $.proxy(function(data) {
      var params = this.parseToken(data);

      this.accessToken = params.oauth_token;
      this.accessTokenSecret = params.oauth_token_secret;
      this.userid = params.user_id;
      this.save();
    }, this)
  );
};

Twitter.prototype.save = function() {
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, this.accessToken);
  localStorage.setItem(ACCESS_TOKEN_SECRET_STORAGE_KEY, this.accessTokenSecret);
  localStorage.setItem(TWITTER_USER_ID_STORAGE_KEY, this.userid);
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

  $.getJSON(OAuth.addToURL(message.action, message.parameters), function(tweets) {
    var root = $("<div>").attr("id", "tweets");

    $.each(tweets, function(i, tweet){
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

      console.log(tweet);

      var tweetView = $("<div>").attr("class", "tweet").append(
        $("<div>").attr("class", "tweet-icon").append(
          $("<img>").attr("src", "https://api.twitter.com/1/users/profile_image?screen_name=" + user.screen_name)
        ),
        $("<div>").attr("class", "tweet-detail").append(
          $("<a>").attr("href", "http://twitter.com/" + user.screen_name).attr("target", "_blank").text(user.name),
          $("<div>").html(normalizeTweetText(tweet))
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

      root.append(tweetView);
    });

    $(elm).append(root);
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
