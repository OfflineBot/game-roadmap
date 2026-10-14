import type { Crate } from './types'

/**
 * Rows of the dependency graph, top to bottom: a crate sits one row below the
 * deepest crate it imports, so row 0 holds the crates that import nothing and
 * the last row holds whatever nothing else builds on.
 */
export function rows(crates: Crate[]): Crate[][] {
    const byId = new Map(crates.map((crate) => [crate.id, crate]))
    const depths = new Map<number, number>()

    const depth = (crate: Crate): number => {
        const known = depths.get(crate.id)
        if (known !== undefined) return known
        depths.set(crate.id, 0)
        const value = crate.depends_on.reduce((deepest, id) => {
            const imported = byId.get(id)
            return imported ? Math.max(deepest, depth(imported) + 1) : deepest
        }, 0)
        depths.set(crate.id, value)
        return value
    }

    const layers: Crate[][] = []
    for (const crate of crates) {
        const row = depth(crate)
        while (layers.length <= row) layers.push([])
        layers[row].push(crate)
    }
    return straighten(layers)
}

/**
 * Keeps a crate close to the ones it imports, which is what turns a bundle of
 * crossing arrows into something readable.
 */
function straighten(layers: Crate[][]): Crate[][] {
    const spot = new Map<number, number>()

    layers.forEach((row, index) => {
        if (index > 0) {
            const pull = (crate: Crate) => {
                const places = crate.depends_on.map((id) => spot.get(id)).filter((at) => at !== undefined)
                return places.length === 0 ? 0.5 : places.reduce((sum, at) => sum + at, 0) / places.length
            }
            row.sort((a, b) => pull(a) - pull(b) || a.name.localeCompare(b.name))
        }
        row.forEach((crate, at) => spot.set(crate.id, row.length === 1 ? 0.5 : at / (row.length - 1)))
    })
    return layers
}

/** Whether adding this import would let a crate end up importing itself. */
export function wouldBeCircular(crates: Crate[], importer: number, imported: number): boolean {
    if (importer === imported) return true
    const byId = new Map(crates.map((crate) => [crate.id, crate]))
    const seen = new Set<number>()

    const reaches = (id: number): boolean => {
        if (id === importer) return true
        if (seen.has(id)) return false
        seen.add(id)
        return (byId.get(id)?.depends_on ?? []).some(reaches)
    }
    return reaches(imported)
}

export function dependencyCount(crates: Crate[]): number {
    return crates.reduce((total, crate) => total + crate.depends_on.length, 0)
}
