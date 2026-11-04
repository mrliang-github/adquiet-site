import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkCacheCost } from './check-cache-cost.mjs'

export default function cacheCostIntegration() {
  let config, buildOutput, routes = []
  return {
    name: 'public-cache-cost-check',
    hooks: {
      'astro:config:done': options => { config = options.config; buildOutput = options.buildOutput },
      'astro:routes:resolved': options => {
        routes = options.routes.map(route => ({
          pattern: route.pattern, pathname: route.pathname, entrypoint: route.entrypoint,
          type: route.type, origin: route.origin, isPrerendered: route.isPrerendered
        }))
      },
      'astro:build:done': async ({ dir, logger }) => {
        const report = await checkCacheCost({ root: fileURLToPath(config.root), outDir: fileURLToPath(dir), routes, buildOutput })
        // Keep implementation evidence out of the published static directory.
        const reportPath = process.env.CACHE_COST_REPORT || join(fileURLToPath(config.cacheDir), 'cache-cost-report.json')
        await mkdir(dirname(reportPath), { recursive: true })
        await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n')
        logger.info(`Static route and Agent data budgets passed: ${report.agentArtifacts.length} data files. Report: ${reportPath}`)
      }
    }
  }
}
