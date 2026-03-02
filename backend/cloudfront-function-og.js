// CloudFront Function: og-bot-rewrite
// Detects social media crawlers on /course/:id paths
// and rewrites the URI to serve the static OG HTML page from S3.
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var ua = (request.headers['user-agent'] && request.headers['user-agent'].value) || '';

  // Only intercept /course/:id paths (not /courses, not /course/:id/something)
  var match = uri.match(/^\/course\/([a-zA-Z0-9_-]+)\/?$/);
  if (!match) return request;

  // Bot user-agent patterns (WhatsApp, Facebook, Twitter, LinkedIn, Telegram, Discord, Slack, etc.)
  var botPattern = /whatsapp|facebookexternalhit|facebot|twitterbot|linkedinbot|telegrambot|discordbot|slackbot|googlebot|bingbot|yandexbot|pinterest|vkshare|redditbot|applebot|embedly|quora|outbrain|showyoubot|rogerbot/i;
  
  if (botPattern.test(ua)) {
    // Rewrite to the pre-generated OG HTML in S3
    var courseId = match[1];
    request.uri = '/og/course/' + courseId + '.html';
  }
  
  return request;
}
