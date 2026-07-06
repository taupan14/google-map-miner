'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createJob } from '@/lib/api'
import { toast } from 'sonner'
import { Map, ArrowRight, Loader2 } from 'lucide-react'

const INDONESIA_PROVINCES = [
  'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau',
  'Jambi', 'Bengkulu', 'Sumatera Selatan', 'Kepulauan Bangka Belitung',
  'Lampung', 'Banten', 'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah',
  'DI Yogyakarta', 'Jawa Timur', 'Bali', 'Nusa Tenggara Barat',
  'Nusa Tenggara Timur', 'Kalimantan Barat', 'Kalimantan Tengah',
  'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
  'Sulawesi Utara', 'Gorontalo', 'Sulawesi Tengah', 'Sulawesi Barat',
  'Sulawesi Selatan', 'Sulawesi Tenggara', 'Maluku', 'Maluku Utara',
  'Papua Barat', 'Papua',
]

export default function NewJobPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    keyword: '',
    country: 'Indonesia',
    province: '',
    city: '',
    district: '',
  })

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.keyword.trim()) {
      toast.error('Keyword is required')
      return
    }
    setLoading(true)
    try {
      const job = await createJob({
        keyword: form.keyword.trim(),
        country: form.country,
        province: form.province || undefined,
        city: form.city || undefined,
        district: form.district || undefined,
      })
      toast.success('Job created! Worker will pick it up shortly.')
      router.push(`/jobs/${job.id}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to create job')
    } finally {
      setLoading(false)
    }
  }

  const searchPreview = [form.keyword, form.district, form.city, form.province]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-text-primary text-2xl font-semibold">New Mining Job</h1>
          <p className="text-text-muted text-sm mt-1">Configure a Google Maps data mining task</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="glass-card p-5 space-y-5">
            <div className="flex items-center gap-2 pb-1 border-b border-bg-border">
              <Map size={14} className="text-text-muted" />
              <span className="text-text-secondary text-sm font-medium">Search Configuration</span>
            </div>
            <div>
              <label className="label">Keyword *</label>
              <input
                type="text"
                placeholder="e.g. Pom Bensin, Restoran Padang, Klinik Gigi"
                value={form.keyword}
                onChange={(e) => set('keyword', e.target.value)}
                className="input-field text-base"
                required
                autoFocus
              />
              <p className="text-text-muted text-xs mt-1.5">Keyword yang akan dicari di Google Maps</p>
            </div>
          </div>

          <div className="glass-card p-5 space-y-5">
            <div className="flex items-center gap-2 pb-1 border-b border-bg-border">
              <span className="text-text-secondary text-sm font-medium">Location (Wilayah)</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Country</label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => set('country', e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Province</label>
                <select
                  value={form.province}
                  onChange={(e) => set('province', e.target.value)}
                  className="input-field"
                >
                  <option value="">— Pilih Provinsi —</option>
                  {INDONESIA_PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">City / Regency</label>
                <input
                  type="text"
                  placeholder="e.g. Bandung, Surabaya"
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">District (Kecamatan)</label>
                <input
                  type="text"
                  placeholder="e.g. Coblong, Cibeunying"
                  value={form.district}
                  onChange={(e) => set('district', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {searchPreview && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-text-muted text-xs uppercase tracking-wide font-medium">Search Query Preview</span>
              </div>
              <div className="bg-bg-base rounded-lg px-3 py-2 font-mono text-sm text-accent border border-bg-border">
                <span className="text-text-muted">maps.google.com/search?q=</span>
                {searchPreview.replace(/ /g, '+')}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !form.keyword.trim()}
            className="btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" />Creating Job...</>
            ) : (
              <>Start Mining<ArrowRight size={16} /></>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
