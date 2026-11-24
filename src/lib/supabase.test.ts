import { describe, it, expect, beforeEach } from 'vitest'
import { fetchProperties, createProperty, deleteProperty } from './supabase'

describe('storage properties', () => {
  beforeEach(() => {
    // @ts-ignore
    if (typeof globalThis.localStorage === 'undefined') globalThis.localStorage = window.localStorage
    localStorage.clear()
  })

  it('seeds demo data on first fetch', async () => {
    const list = await fetchProperties()
    expect(list.length).toBeGreaterThan(0)
  })

  it('creates and deletes a property', async () => {
    const created = await createProperty({
      code: 'T-1', title: 'Teste', property_type: 'Casa', purpose: 'Venda',
      price: 100, city: 'X', neighborhood: 'Y', address: null, bedrooms: 1, bathrooms: 1,
      area: 50, status: 'Disponível', description: null, image_url: null, images: null, tags: null, lat: null, lng: null,
    })
    expect(created.id).toBeTruthy()
    const after = await fetchProperties()
    expect(after.find(p => p.id === created.id)).toBeTruthy()
    await deleteProperty(created.id)
    const final = await fetchProperties()
    expect(final.find(p => p.id === created.id)).toBeUndefined()
  })
})