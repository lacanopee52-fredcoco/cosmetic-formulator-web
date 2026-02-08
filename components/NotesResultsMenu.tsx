'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FormulaNotes } from '@/types'

interface NotesResultsMenuProps {
  notes?: FormulaNotes
  onChange: (notes: FormulaNotes) => void
}

const NOTE_CATEGORIES = [
  { key: 'protocole', label: 'Protocole', icon: '📋' },
  { key: 'aspect', label: 'Aspect', icon: '🎨' },
  { key: 'odeur', label: 'Odeur', icon: '👃' },
  { key: 'ph', label: 'pH', icon: '🧪' },
  { key: 'microscope', label: 'Microscope', icon: '🔬' },
  { key: 'remarque', label: 'Remarque', icon: '💬' },
  { key: 'conditionnement', label: 'Conditionnement', icon: '📦' },
  { key: 'conclusion', label: 'Conclusion', icon: '✅' }
] as const

export default function NotesResultsMenu({ notes, onChange }: NotesResultsMenuProps) {
  const [fullPageOpen, setFullPageOpen] = useState(false)

  useEffect(() => {
    if (fullPageOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [fullPageOpen])

  const handleUpdateCategory = (key: keyof FormulaNotes, value: string) => {
    onChange({ ...notes, [key]: value })
  }

  const handlePhotoChange = (categoryKey: string, dataUrl: string | null) => {
    const currentPhotos = notes?.photos ?? {}
    const newPhotos = dataUrl
      ? { ...currentPhotos, [categoryKey]: dataUrl }
      : Object.fromEntries(Object.entries(currentPhotos).filter(([k]) => k !== categoryKey))
    onChange({ ...notes, photos: Object.keys(newPhotos).length ? newPhotos : undefined })
  }

  const hasNotes = notes && Object.values(notes).some((v) => typeof v === 'string' && v.trim() !== '')
  const hasPhotos = notes?.photos && Object.keys(notes.photos).length > 0

  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 transition-colors flex items-center gap-2"
        onClick={() => setFullPageOpen(true)}
      >
        <span>📋</span>
        <span>Notes & Résultats</span>
        {(hasNotes || hasPhotos) && (
          <span className="bg-purple-600 text-white px-2 py-0.5 rounded-full text-xs w-5 h-5 flex items-center justify-center">
            ●
          </span>
        )}
        <span>▶</span>
      </button>

      {/* Pleine page : tout l'écran, notes directement sous chaque rubrique */}
      {fullPageOpen && (
        <div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col w-screen h-screen">
          <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-purple-600 text-white shrink-0">
            <h2 className="text-xl font-bold">📋 Notes & Résultats</h2>
            <button
              type="button"
              onClick={() => setFullPageOpen(false)}
              className="p-2 rounded-lg text-white/90 hover:bg-white/20 transition-colors"
              aria-label="Fermer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0">
            {/* Grille pleine largeur : 2 rubriques par ligne, notes directement en dessous */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {NOTE_CATEGORIES.map((category) => {
                const value = (notes?.[category.key as keyof FormulaNotes] as string) || ''
                const photoUrl = notes?.photos?.[category.key]
                return (
                  <section
                    key={category.key}
                    className="flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-h-[280px]"
                  >
                    {/* Rubrique */}
                    <div className="px-4 py-3 bg-purple-50 border-b border-gray-200 shrink-0">
                      <h3 className="text-base font-semibold text-purple-800 flex items-center gap-2">
                        <span>{category.icon}</span>
                        {category.label}
                      </h3>
                    </div>
                    {/* Notes directement en dessous */}
                    <div className="flex-1 flex flex-col p-4 min-h-0">
                      <textarea
                        value={value}
                        onChange={(e) => handleUpdateCategory(category.key as keyof FormulaNotes, e.target.value)}
                        className="w-full flex-1 min-h-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-y"
                        placeholder={`Notes pour ${category.label.toLowerCase()}...`}
                        rows={5}
                      />
                      {/* Icône photo uniquement pour Aspect et Microscope */}
                      {(category.key === 'aspect' || category.key === 'microscope') && (
                        <div className="mt-2 flex items-center gap-2 shrink-0">
                          <PhotoIcon
                            photoUrl={photoUrl}
                            categoryLabel={category.label}
                            onChange={(dataUrl) => handlePhotoChange(category.key, dataUrl)}
                          />
                        </div>
                      )}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Icône photo : clic pour ajouter/changer. Agrandissement au survol uniquement, dans un portail (une seule image, pas de superposition). */
function PhotoIcon({
  photoUrl,
  categoryLabel,
  onChange,
}: {
  photoUrl?: string
  categoryLabel: string
  onChange: (dataUrl: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const iconButtonRef = useRef<HTMLButtonElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewPosition, setPreviewPosition] = useState<{ top: number; left: number } | null>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleIconClick = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    setShowPreview(false)
    setPreviewPosition(null)
    inputRef.current?.click()
  }

  const handleIconMouseEnter = () => {
    if (!photoUrl) return
    if (openTimerRef.current) return
    openTimerRef.current = setTimeout(() => {
      openTimerRef.current = null
      const btn = iconButtonRef.current
      if (btn) {
        const rect = btn.getBoundingClientRect()
        setPreviewPosition({ left: rect.left, top: rect.top })
        setShowPreview(true)
      }
    }, 150)
  }

  const handleIconMouseLeave = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    closePreview()
  }

  const closePreview = () => {
    setShowPreview(false)
    setPreviewPosition(null)
  }
  const closePreviewRef = useRef(closePreview)
  closePreviewRef.current = closePreview

  const handleExportImage = () => {
    if (!photoUrl) return
    const ext = photoUrl.startsWith('data:image/png') ? 'png' : 'jpg'
    const a = document.createElement('a')
    a.href = photoUrl
    a.download = `photo-${categoryLabel.replace(/\s+/g, '-')}.${ext}`
    a.click()
  }

  useEffect(() => {
    if (!showPreview || !photoUrl) return
    const isInsideRect = (r: DOMRect | undefined, x: number, y: number) =>
      r != null && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
    const onMove = (e: MouseEvent) => {
      const x = e.clientX
      const y = e.clientY
      const btnRect = iconButtonRef.current?.getBoundingClientRect()
      const prevRect = previewRef.current?.getBoundingClientRect()
      const onButton = isInsideRect(btnRect, x, y)
      const onPreview = isInsideRect(prevRect, x, y)
      if (!onButton && !onPreview) closePreview()
    }
    document.addEventListener('mousemove', onMove)
    return () => document.removeEventListener('mousemove', onMove)
  }, [showPreview, photoUrl])

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <div className="relative inline-flex items-center gap-1">
        {/* Coque 36×36 px fixe pour éviter que l'icône grandisse et pour stabiliser (plus de tremblement) */}
        <div className="shrink-0 overflow-hidden rounded-lg border border-gray-300" style={{ width: 36, height: 36 }}>
          <button
            ref={iconButtonRef}
            type="button"
            onClick={handleIconClick}
            onMouseEnter={handleIconMouseEnter}
            onMouseLeave={handleIconMouseLeave}
            className="w-full h-full flex items-center justify-center bg-gray-50 hover:bg-purple-50 border-0 rounded-lg transition-colors"
            style={{ minWidth: 0, minHeight: 0 }}
            title={photoUrl ? `Changer la photo — survol pour agrandir — ${categoryLabel}` : `Ajouter une photo — ${categoryLabel}`}
          >
            {photoUrl ? (
              <img src={photoUrl} alt="" className="pointer-events-none object-cover" style={{ width: 36, height: 36, minWidth: 0, minHeight: 0, maxWidth: 36, maxHeight: 36 }} />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
        {photoUrl && showPreview && previewPosition && typeof document !== 'undefined' &&
          createPortal(
            <>
              {/* Overlay plein écran : clic ou souris dessus = fermer la prévisualisation */}
              <div
                className="fixed inset-0 z-[9998] cursor-default"
                style={{ background: 'transparent' }}
                onMouseEnter={() => closePreviewRef.current()}
                onMouseDown={() => closePreviewRef.current()}
                onClick={() => closePreviewRef.current()}
                aria-hidden
              />
              <div
                ref={previewRef}
                className="fixed z-[9999] w-[240px] rounded-lg shadow-xl border border-gray-200 bg-white p-1.5 will-change-transform"
                style={{
                  left: previewPosition.left,
                  top: previewPosition.top - 8,
                  transform: 'translateY(-100%)',
                }}
              >
                <div className="relative">
                  <img src={photoUrl} alt={categoryLabel} className="w-full h-auto max-h-[240px] object-contain rounded block" />
                  <div className="absolute top-1 right-1 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={closePreview}
                    className="w-7 h-7 rounded-full bg-gray-800/80 text-white flex items-center justify-center hover:bg-gray-900 text-xs font-medium"
                    title="Fermer"
                  >
                    ✕
                  </button>
                </div>
                <div className="absolute bottom-2 right-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => { onChange(null); closePreview() }}
                      className="w-8 h-8 rounded-full bg-red-500/90 text-white flex items-center justify-center hover:bg-red-600 shadow"
                      title="Supprimer la photo"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportImage}
                      className="w-8 h-8 rounded-full bg-white/90 text-gray-700 flex items-center justify-center hover:bg-white shadow border border-gray-200"
                      title="Exporter / Télécharger l'image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </>,
            document.body
          )}
        {photoUrl && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(null) }}
            className="text-xs text-gray-500 hover:text-red-600"
            title="Supprimer la photo"
          >
            Supprimer
          </button>
        )}
      </div>
    </>
  )
}
