const securityHeaders = {
     'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
        'X-Content-Type-Options': 'nosniff',
               'X-Frame-Options': 'DENY',
               'Referrer-Policy': 'strict-origin-when-cross-origin',
       'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'",
            'Permissions-Policy': 'geolocation=(), microphone=()',
              'X-XSS-Protection': '1; mode=block',
  'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-site'
};
export default securityHeaders