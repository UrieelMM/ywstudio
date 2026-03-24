import { create as actualCreate } from 'zustand'

// Guardamos funciones de reinicio para todos los stores creados con este factory.
const storeResetFns = new Set()

export const resetAllStores = () => {
  storeResetFns.forEach((resetFn) => {
    resetFn()
  })
}

export const create = () => {
  return (initializer) => {
    let initialState

    const storeInitializer = (set, get, store) => {
      const result = initializer(set, get, store)
      initialState = { ...result }
      return result
    }

    const store = actualCreate()(storeInitializer)

    const resetFn = () => {
      store.setState(initialState, true)
    }

    storeResetFns.add(resetFn)

    return store
  }
}

