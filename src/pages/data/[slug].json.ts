import type { APIRoute } from 'astro'
import { catalogs } from '@/data/catalog'

export function getStaticPaths() {
  return catalogs.map(data => ({params: {slug: data.metadata.slug}, props: {data}}))
}
export const GET: APIRoute = ({props}) => new Response(JSON.stringify(props.data), {
  headers: {'Content-Type': 'application/json; charset=utf-8'}
})
