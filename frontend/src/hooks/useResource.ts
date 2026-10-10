import { useCallback, useEffect, useState } from 'react'

function message(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
}

/**
 * Loads a resource and re-reads it after every mutation, so the server stays
 * the only source of truth.
 */
export function useResource<T>(load: () => Promise<T>) {
    const [data, setData] = useState<T | null>(null)
    const [error, setError] = useState<string | null>(null)

    const reload = useCallback(async () => {
        try {
            setData(await load())
            setError(null)
        } catch (failure) {
            setError(message(failure))
        }
    }, [load])

    useEffect(() => {
        void reload()
    }, [reload])

    const run = useCallback(
        async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
            let result: T
            try {
                result = await action()
            } catch (failure) {
                setError(message(failure))
                return undefined
            }
            await reload()
            return result
        },
        [reload],
    )

    return { data, error, run, reload }
}
