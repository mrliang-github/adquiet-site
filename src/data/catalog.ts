import giants from './catalog/little-giants.json'
import unicorns from './catalog/unicorns.json'
import type { Catalog } from '../lib/catalog'

export const catalogs: Catalog[] = [giants, unicorns]
export const catalogBySlug = (slug: string) => catalogs.find(c => c.metadata.slug === slug)
