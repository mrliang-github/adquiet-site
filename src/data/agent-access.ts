import { catalogs } from './catalog'
import { buildAgentBundle } from '../lib/agent-data'

// Executed during static generation; none of this module is shipped to the browser.
export const agentBundle = buildAgentBundle(catalogs)
