var Twitter = function() {
  this.access_token = localStorage.getItem("access_token");
  this.access_token_secret = localStorage.getItem("access_token_secret");
  this.user_id = localStorage.getItem("user_id");
};

Twitter.prototype.parseToken = function(data) {
  if (data !== undefined) {
    var tokens = data.split('&');

    var parsedToken = {};

    tokens.forEach(function(token) {
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
      var token = params["oauth_token"];
      var secret = params["oauth_token_secret"];

      message.action = "https://api.twitter.com/oauth/authorize";
      message.parameters["oauth_token"] = token;

      accessor["oauth_token_secret"] = secret;

      OAuth.setTimestampAndNonce(message);
      OAuth.SignatureMethod.sign(message, accessor);

      this.request_token = token;
      this.request_token_secret = secret;

      window.open(OAuth.addToURL(message.action, message.parameters));
    }, this)
  );
};

Twitter.prototype.sign = function(pin) {
  var message = {
    "method": "GET",
    "action": "https://api.twitter.com/oauth/access_token",
    "parameters": {
      "oauth_consumer_key": CONSUMER_KEY,
      "oauth_signature_method": "HMAC-SHA1",
      "oauth_token": this.request_token,
      "oauth_verifier": pin
    }
  };

  var accessor = {
    "consumerSecret": CONSUMER_SECRET,
    "tokenSecret": this.request_token_secret
  };

  OAuth.setTimestampAndNonce(message);
  OAuth.SignatureMethod.sign(message, accessor);

  var self = this;

  $.get(
    OAuth.addToURL(message.action, message.parameters),
    $.proxy(function(data) {
      var params = this.parseToken(data);

      this.access_token = params["oauth_token"];
      this.access_token_secret = params["oauth_token_secret"];
      this.user_id = params["user_id"];
      this.save();
    }, this)
  );
};

Twitter.prototype.save = function() {
  localStorage.setItem("access_token", this.access_token);
  localStorage.setItem("access_token_secret", this.access_token_secret);
  localStorage.setItem("user_id", this.user_id);
};

Twitter.prototype.isAuthenticated = function() {
  if (this.access_token !== null && this.access_token_secret !== null) {
    if (/^\d+$/.test(this.user_id)) {
      return true;
    }
  }

  return false;
};

Twitter.prototype.fetchTimelines = function(cb) {
  var message = {
    "method": "GET",
    "action": "https://api.twitter.com/1/statuses/home_timeline.json",
    "parameters": {
      "oauth_consumer_key": CONSUMER_KEY,
      "oauth_signature_method": "HMAC-SHA1",
      "oauth_token": this.access_token
    }
  };

  var accessor = {
    "consumerSecret": CONSUMER_SECRET,
    "tokenSecret": this.access_token_secret
  };

  OAuth.setTimestampAndNonce(message);
  OAuth.SignatureMethod.sign(message, accessor);

  $.getJSON(OAuth.addToURL(message.action, message.parameters), function(data) {
    cb(data);
  });
};
