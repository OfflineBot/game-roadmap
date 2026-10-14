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

    for (const crate of crates) depth(crate)
    tighten(crates, depths)

    const layers: Crate[][] = []
    for (const crate of crates) {
        const row = depths.get(crate.id) ?? 0
        while (layers.length <= row) layers.push([])
        layers[row].push(crate)
    }
    return straighten(layers.filter((row) => row.length > 0))
}

/**
 * Counting from the deepest import alone leaves a crate stranded rows above
 * whatever uses it - a crate only `game` needs would sit at the very top. This
 * drops each one to just above its lowest importer, which keeps arrows short.
 */
function tighten(crates: Crate[], depths: Map<number, number>): void {
    const importers = new Map<number, number[]>()
    for (const crate of crates) {
        for (const id of crate.depends_on) {
            importers.set(id, [...(importers.get(id) ?? []), crate.id])
        }
    }

    // Deepest first, so a crate is placed after everything that imports it.
    const order = [...crates].sort((a, b) => (depths.get(b.id) ?? 0) - (depths.get(a.id) ?? 0))
    for (const crate of order) {
        const above = importers.get(crate.id) ?? []
        if (above.length === 0) continue
        depths.set(crate.id, Math.min(...above.map((id) => depths.get(id) ?? 0)) - 1)
    }
}

/**
 * Keeps a crate close to the ones it imports and to the ones importing it,
 * which is what turns a bundle of crossing arrows into something readable.
 * Two sweeps in each direction are enough to settle a workspace this size.
 */
function straighten(layers: Crate[][]): Crate[][] {
    const spot = new Map<number, number>()
    const importers = new Map<number, number[]>()
    for (const row of layers) {
        for (const crate of row) {
            for (const id of crate.depends_on) {
                importers.set(id, [...(importers.get(id) ?? []), crate.id])
            }
        }
    }

    const place = (row: Crate[]) =>
        row.forEach((crate, at) => spot.set(crate.id, row.length === 1 ? 0.5 : at / (row.length - 1)))
    layers.forEach(place)

    // A crate with no neighbour to line up with keeps the place it has.
    const middle = (ids: number[], stay: number) => {
        const places = ids.map((id) => spot.get(id)).filter((at) => at !== undefined)
        return places.length === 0 ? stay : places.reduce((sum, at) => sum + at, 0) / places.length
    }

    const sweep = (row: Crate[], neighbours: (crate: Crate) => number[]) => {
        const pull = new Map(row.map((crate) => [crate.id, middle(neighbours(crate), spot.get(crate.id) ?? 0.5)]))
        row.sort((a, b) => (pull.get(a.id) ?? 0) - (pull.get(b.id) ?? 0) || a.name.localeCompare(b.name))
        place(row)
    }

    for (let pass = 0; pass < 2; pass++) {
        for (let row = 1; row < layers.length; row++) {
            sweep(layers[row], (crate) => crate.depends_on)
        }
        for (let row = layers.length - 2; row >= 0; row--) {
            sweep(layers[row], (crate) => importers.get(crate.id) ?? [])
        }
    }
    return layers
}

/**
 * Imports that another path already spells out: if a crate imports both entity
 * and game while entity imports game, the arrow straight to game only repeats
 * what the picture says anyway. They are drawn, but faintly.
 */
export function implied(crates: Crate[]): Set<string> {
    const byId = new Map(crates.map((crate) => [crate.id, crate]))

    const reaches = (from: number, to: number, seen: Set<number>): boolean => {
        if (seen.has(from)) return false
        seen.add(from)
        return (byId.get(from)?.depends_on ?? []).some((id) => id === to || reaches(id, to, seen))
    }

    const repeats = new Set<string>()
    for (const crate of crates) {
        for (const id of crate.depends_on) {
            const overAnother = crate.depends_on.some(
                (other) => other !== id && reaches(other, id, new Set()),
            )
            if (overAnother) repeats.add(`${crate.id}-${id}`)
        }
    }
    return repeats
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
