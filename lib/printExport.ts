const PRINT_STYLES = `
  * { box-sizing: border-box; }
  .print-export-body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 12px; line-height: 1.4; color: #1f2937; margin: 20px; }
  .print-export-body h1 { font-size: 18px; margin: 0 0 16px; color: #111; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
  .print-export-body h2 { font-size: 14px; margin: 16px 0 8px; color: #374151; }
  .print-export-body table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  .print-export-body th, .print-export-body td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; }
  .print-export-body th { background: #eff6ff; font-weight: 600; }
  .print-export-body tr:nth-child(even) { background: #f9fafb; }
  .print-export-body .meta { color: #6b7280; font-size: 11px; margin-bottom: 16px; }
  .print-export-body .section { margin-bottom: 20px; }
  .print-export-body .ifra-main-table { max-width: 400px; margin-bottom: 24px; }
  .print-export-body .annexe-title { margin-top: 24px; }
  .print-export-body .annexe-intro { font-size: 11px; color: #6b7280; margin-bottom: 8px; }
  .print-export-body .ifra-annexe-table .cat-num { font-weight: 600; width: 60px; vertical-align: top; }
  .print-export-body .ifra-annexe-table .cat-desc { font-size: 10px; }
  .print-export-body .ifra-footer { margin-top: 20px; font-size: 10px; }
  .print-export-body .notes-photos-section { margin-top: 16px; }
  .print-export-body .notes-photo-block { margin-bottom: 16px; break-inside: avoid; }
  .print-export-body .notes-photo-block strong { display: block; margin-bottom: 6px; }
  .print-export-body .notes-photo-img { max-width: 280px; max-height: 200px; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 6px; }
  .print-export-body .print-formula-header-oneline { margin: 0 0 16px 0; padding: 10px 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 12px; font-weight: 700; line-height: 1.5; }
  .print-export-body .print-formula-table { border-collapse: collapse; }
  .print-export-body .print-formula-table th,
  .print-export-body .print-formula-table td { border: 1px solid #d1d5db; padding: 6px 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print-export-body .print-formula-table thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print-export-body .print-formula-table tbody tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print-export-body .print-summary { margin-top: 20px; padding: 12px 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; }
  .print-export-body .print-summary-table { max-width: 400px; margin: 0 0 12px 0; }
  .print-export-body .print-summary-table td { padding: 4px 12px 4px 0; border: none; background: transparent; }
  .print-export-body .print-phase-totals { margin: 0; font-size: 12px; }
`

const PRINT_BODY_ID = 'print-export-body-root'

/**
 * Affiche le contenu dans un élément de la page et lance l'impression (sans pop-up).
 * Pour permettre plusieurs pages, le contenu est injecté dans body avant l'impression.
 * L'utilisateur peut choisir "Enregistrer au format PDF" dans la boîte de dialogue d'impression.
 */
export function printInPage(container: HTMLElement, title: string, bodyHtml: string): void {
  const fullHtml = `
    <style>${PRINT_STYLES}</style>
    <div class="print-export-body">
      ${bodyHtml}
    </div>
  `
  container.innerHTML = fullHtml
  container.setAttribute('data-print-title', title)

  // Injecter une copie dans body pour l'impression : seul ce nœud est visible en @media print,
  // en flux normal, pour que la hauteur du document couvre tout le contenu (plusieurs pages).
  const existing = document.getElementById(PRINT_BODY_ID)
  if (existing) existing.remove()
  const printRoot = document.createElement('div')
  printRoot.id = PRINT_BODY_ID
  printRoot.setAttribute('aria-hidden', 'true')
  printRoot.innerHTML = fullHtml
  document.body.insertBefore(printRoot, document.body.firstChild)
  document.body.classList.add('print-export-active')

  const onAfterPrint = () => {
    document.body.classList.remove('print-export-active')
    const el = document.getElementById(PRINT_BODY_ID)
    if (el) el.remove()
    container.innerHTML = ''
    container.removeAttribute('data-print-title')
    window.removeEventListener('afterprint', onAfterPrint)
  }

  window.addEventListener('afterprint', onAfterPrint)
  window.print()
}

function escapeHtml(s: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return s.replace(/[&<>"']/g, (c) => map[c] ?? c)
}

export function escapeHtmlContent(s: string): string {
  return escapeHtml(s)
}
