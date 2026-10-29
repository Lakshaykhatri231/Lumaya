import { Router } from 'express';
import { SitemapStream, streamToPromise } from 'sitemap';
import { createGzip } from 'zlib';

const router = Router();

router.get('/sitemap.xml', async (req, res) => {
    try {
        res.header('Content-Type', 'application/xml');
        res.header('Content-Encoding', 'gzip');

        const smStream = new SitemapStream({ hostname: process.env.FRONTEND_URL || 'https://thelumaya.com' });
        const pipeline = smStream.pipe(createGzip());

        // Public pages
        smStream.write({ url: '/', changefreq: 'daily', priority: 1.0 });
        smStream.write({ url: '/auth', changefreq: 'monthly', priority: 0.5 });
        smStream.write({ url: '/about', changefreq: 'monthly', priority: 0.6 });
        smStream.write({ url: '/chat-guide', changefreq: 'monthly', priority: 0.5 });
        smStream.write({ url: '/privacy', changefreq: 'monthly', priority: 0.4 });

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