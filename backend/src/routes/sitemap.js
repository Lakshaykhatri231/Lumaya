import { Router } from 'express';
import { SitemapStream, streamToPromise } from 'sitemap';
import { createGzip } from 'zlib';

const router = Router();

router.get('/sitemap.xml', async (req, res) => {
    try {
        res.header('Content-Type', 'application/xml');
        res.header('Content-Encoding', 'gzip');

        const smStream = new SitemapStream({ hostname: 'https://www.xryptt.com' });
        const pipeline = smStream.pipe(createGzip());

        // Public pages - highest priority
        smStream.write({ url: '/', changefreq: 'daily', priority: 1.0 });
        smStream.write({ url: '/auth', changefreq: 'monthly', priority: 0.5 });
        smStream.write({ url: '/pricing', changefreq: 'weekly', priority: 0.8 });
        smStream.write({ url: '/about', changefreq: 'monthly', priority: 0.6 });
        
        // Legal pages - should be indexed but lower priority
        smStream.write({ url: '/refund-policy', changefreq: 'monthly', priority: 0.4 });
        smStream.write({ url: '/privacy-policy', changefreq: 'monthly', priority: 0.4 });
        smStream.write({ url: '/terms-of-service', changefreq: 'monthly', priority: 0.4 });
        
        // Protected routes - lower priority as they require login
        // Note: Including these helps with SEO even though they redirect to login
        smStream.write({ url: '/register', changefreq: 'weekly', priority: 0.7 });
        smStream.write({ url: '/analyzer', changefreq: 'weekly', priority: 0.7 });
        smStream.write({ url: '/stealth', changefreq: 'weekly', priority: 0.7 });
        smStream.write({ url: '/dashboard', changefreq: 'weekly', priority: 0.7 });
        smStream.write({ url: '/portfolio', changefreq: 'weekly', priority: 0.7 });

        smStream.end();

        streamToPromise(pipeline)
            .then((sm) => res.send(sm))
            .catch((err) => {
                console.error('Error generating sitemap stream:', err);
                res.status(500).end();
            });
    } catch (err) {
        console.error('Error in sitemap generation:', err);
        res.status(500).end();
    }
});

export default router;