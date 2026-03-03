// CloudFront Function: og-bot-rewrite
// Detects social media crawlers on /course/:id paths
// and redirects them to the backend OG endpoint for dynamic meta tags.
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
    var courseId = match[1];
    return {
      statusCode: 302,
      statusDescription: 'Found',
      headers: {
        'location': { value: 'https://fobcdczma3.execute-api.us-east-1.amazonaws.com/dev/e/share/course/' + courseId },
        'cache-control': { value: 'no-cache, no-store' }
      }
    };
  }

  return request;
}
