/// <reference types="node" />
/**
 * Run individual seeds by filename: tsx prisma/seed-runner.ts <seed-name>
 *
 * The seed name matches the file: prisma/seeds/{name}-seed.ts
 * The file must export a function matching: seed{PascalName}(prisma)
 *
 * Examples:
 *   tsx prisma/seed-runner.ts currencies
 *   tsx prisma/seed-runner.ts countries-states
 *   tsx prisma/seed-runner.ts expertise industries
 *   npm run seed:run languages
 *
 * List available seeds:
 *   tsx prisma/seed-runner.ts --list
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()
const SEEDS_DIR = path.join(__dirname, 'seeds')

/** List all available seed names (derived from filenames like xxx-seed.ts) */
function getAvailableSeeds(): string[] {
  return fs.readdirSync(SEEDS_DIR)
    .filter(f => f.endsWith('-seed.ts'))
    .map(f => f.replace('-seed.ts', ''))
    .sort()
}

/**
 * Convert kebab-case seed name to the expected export function name.
 * e.g. "countries-states" → "seedCountriesAndStates", "currencies" → "seedCurrencies"
 *
 * Convention: file is {name}-seed.ts, function is seed{PascalCase}(prisma).
 * Words joined by "-" become PascalCase; "and" is inserted between multi-word names
 * only if the function actually uses it — so we try multiple patterns.
 */
function toPascalCase(name: string): string {
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')
}

async function loadAndRunSeed(name: string): Promise<void> {
  const filePath = path.join(SEEDS_DIR, `${name}-seed.ts`)
  if (!fs.existsSync(filePath)) {
    const available = getAvailableSeeds()
    console.error(`Seed file not found: prisma/seeds/${name}-seed.ts`)
    console.error(`Available seeds: ${available.join(', ')}`)
    process.exit(1)
  }

  // Dynamic import the seed file
  const mod = await import(filePath)

  // Try to find the seed function: seed{PascalCase}, or first exported async function with "seed" prefix
  const pascal = toPascalCase(name)
  const candidates = [
    `seed${pascal}`,                                      // seedCountriesStates
    `seed${pascal.replace(/([a-z])([A-Z])/g, '$1And$2')}`, // seedCountriesAndStates
  ]

  let seedFn: ((p: PrismaClient, ...args: any[]) => Promise<any>) | null = null
  for (const fnName of candidates) {
    if (typeof mod[fnName] === 'function') {
      seedFn = mod[fnName]
      break
    }
  }

  // Fallback: find any exported function starting with "seed"
  if (!seedFn) {
    const seedExport = Object.keys(mod).find(k => k.startsWith('seed') && typeof mod[k] === 'function')
    if (seedExport) {
      seedFn = mod[seedExport]
    }
  }

  if (!seedFn) {
    console.error(`No seed function found in prisma/seeds/${name}-seed.ts`)
    console.error(`Expected: export async function seed${pascal}(prisma) or similar`)
    process.exit(1)
  }

  await seedFn(prisma)
}

async function main() {
  const args = process.argv.slice(2).map(a => a.toLowerCase())

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    const available = getAvailableSeeds()
    console.log('Usage: tsx prisma/seed-runner.ts <seed-name> [seed-name...]')
    console.log('')
    console.log('Available seeds:')
    available.forEach(name => console.log(`  ${name}`))
    console.log('')
    console.log('Examples:')
    console.log('  tsx prisma/seed-runner.ts currencies')
    console.log('  tsx prisma/seed-runner.ts countries-states languages')
    console.log('  npm run seed:run expertise')
    process.exit(0)
  }

  if (args.includes('--list')) {
    const available = getAvailableSeeds()
    available.forEach(name => console.log(name))
    process.exit(0)
  }

  for (const name of args) {
    console.log(`\n🌱 Running seed: ${name}...`)
    await loadAndRunSeed(name)
    console.log(`✅ Done: ${name}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
