import type { APIRoute } from 'astro'
import { agentBundle } from '@/data/agent-access'
import schema from '@/data/agent-schema.json'
import { AGENT_BASE, AGENT_README, AGENT_SKILL_MD, AGENT_SKILL_README } from '../../../lib/agent-data'

export const prerender = true
export function getStaticPaths() {
  return [
    ...agentBundle.assets,
    { path: `${AGENT_BASE}/schema.json`, body: JSON.stringify(schema), contentType: 'application/schema+json; charset=utf-8' },
    { path: `${AGENT_BASE}/README.md`, body: AGENT_README, contentType: 'text/markdown; charset=utf-8' },
    { path: `${AGENT_BASE}/skill/SKILL.md`, body: AGENT_SKILL_MD, contentType: 'text/markdown; charset=utf-8' },
    { path: `${AGENT_BASE}/skill/README.md`, body: AGENT_SKILL_README, contentType: 'text/markdown; charset=utf-8' }
  ].map(asset => ({ params: { resource: asset.path.slice(AGENT_BASE.length + 1) }, props: { asset } }))
}

export const GET: APIRoute = ({ props }) => new Response(props.asset.body, {
  headers: { 'Content-Type': props.asset.contentType }
})
