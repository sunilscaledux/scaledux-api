import { Router } from 'express';
import { getSitemap } from './SitemapController';

const router = Router();

router.get('/sitemap.xml', getSitemap);

export default router;
